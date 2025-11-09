import { TokenData, SortField, TimeFrame } from '../../types/token.types';
import { dexScreenerService } from './dexscreener.service';
import { geckoTerminalService } from './geckoterminal.service';
import { tokenMergerService } from './merger.service';
import { redisService } from '../cache/redis.service';
import { logger } from '../../utils/logger';

export class AggregationService {
  private readonly CACHE_KEY_PREFIX = 'tokens:';
  private readonly CACHE_TTL = 30; // 30 seconds

  async fetchAndAggregateTokens(): Promise<TokenData[]> {
    try {
      logger.info('Starting token aggregation from multiple sources...');
      
      // Fetch from multiple sources in parallel
      const [dexScreenerResult, geckoTerminalResult] = await Promise.allSettled([
        dexScreenerService.getTrendingTokens(100),
        geckoTerminalService.getTrendingTokens(50),
      ]);

      const tokensList: TokenData[][] = [];
      
      if (dexScreenerResult.status === 'fulfilled') {
        logger.info(`✓ DexScreener: ${dexScreenerResult.value.length} tokens`);
        tokensList.push(dexScreenerResult.value);
      } else {
        logger.error('✗ DexScreener failed:', dexScreenerResult.reason);
      }

      if (geckoTerminalResult.status === 'fulfilled') {
        logger.info(`✓ GeckoTerminal: ${geckoTerminalResult.value.length} tokens`);
        tokensList.push(geckoTerminalResult.value);
      } else {
        logger.error('✗ GeckoTerminal failed:', geckoTerminalResult.reason);
      }

      // Merge tokens from all sources
      const mergedTokens = tokenMergerService.mergeTokens(tokensList);
      
      // Cache individual tokens
      await this.cacheTokens(mergedTokens);
      
      logger.info(`✓ Aggregated ${mergedTokens.length} unique tokens from ${tokensList.length} sources`);
      return mergedTokens;
    } catch (error) {
      logger.error('Error aggregating tokens:', error);
      throw error;
    }
  }

  async getTokens(
    limit: number = 20,
    sortBy: SortField = 'volume',
    timeframe: TimeFrame = '24h'
  ): Promise<TokenData[]> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}list:${sortBy}:${timeframe}:${limit}`;
    
    // Try cache first
    const cached = await redisService.get<TokenData[]>(cacheKey);
    if (cached) {
      logger.debug('Cache hit for tokens list');
      return cached;
    }

    logger.info('Cache miss - fetching fresh token data');

    // Cache miss - fetch and aggregate
    const tokens = await this.fetchAndAggregateTokens();
    const sorted = this.sortTokens(tokens, sortBy);
    const limited = sorted.slice(0, limit);
    
    // Cache the result
    await redisService.set(cacheKey, limited, this.CACHE_TTL);
    
    return limited;
  }

  async searchTokens(query: string): Promise<TokenData[]> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}search:${query.toLowerCase()}`;
    
    const cached = await redisService.get<TokenData[]>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for search: ${query}`);
      return cached;
    }

    logger.info(`Searching tokens for: ${query}`);

    // Search in multiple sources
    const [dexScreenerResult, geckoTerminalResult] = await Promise.allSettled([
      dexScreenerService.searchTokens(query),
      geckoTerminalService.searchTokens(query),
    ]);

    const results: TokenData[] = [];

    if (dexScreenerResult.status === 'fulfilled') {
      results.push(...dexScreenerResult.value);
    }

    if (geckoTerminalResult.status === 'fulfilled') {
      results.push(...geckoTerminalResult.value);
    }

    // Deduplicate and merge
    const merged = tokenMergerService.mergeTokens([results]);
    
    await redisService.set(cacheKey, merged, 60); // Cache for 1 minute
    
    logger.info(`Found ${merged.length} tokens matching "${query}"`);
    return merged;
  }

  async getTokenByAddress(address: string): Promise<TokenData | null> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${address}`;
    
    const cached = await redisService.get<TokenData>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for token: ${address}`);
      return cached;
    }

    logger.info(`Fetching token by address: ${address}`);

    // Try to fetch from DexScreener (primary source for individual tokens)
    const token = await dexScreenerService.getTokenByAddress(address);
    
    if (token) {
      await redisService.set(cacheKey, token, this.CACHE_TTL);
    }
    
    return token;
  }

  private async cacheTokens(tokens: TokenData[]): Promise<void> {
    const cachePromises = tokens.map(token =>
      redisService.set(
        `${this.CACHE_KEY_PREFIX}${token.token_address}`, 
        token,
        this.CACHE_TTL
      )
    );
    await Promise.allSettled(cachePromises); // Use allSettled to not fail if one cache fails
  }

  private sortTokens(tokens: TokenData[], sortBy: SortField): TokenData[] {
    const sorted = [...tokens];
    
    switch (sortBy) {
      case 'volume':
        return sorted.sort((a, b) => b.volume_sol - a.volume_sol);
      case 'price_change':
        return sorted.sort((a, b) => b.price_1hr_change - a.price_1hr_change);
      case 'market_cap':
        return sorted.sort((a, b) => b.market_cap_sol - a.market_cap_sol);
      case 'liquidity':
        return sorted.sort((a, b) => b.liquidity_sol - a.liquidity_sol);
      default:
        return sorted;
    }
  }
}

export const aggregationService = new AggregationService();