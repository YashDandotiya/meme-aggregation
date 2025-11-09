import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { RateLimiter } from '../../utils/rateLimiter';
import { retryWithBackoff } from '../../utils/retry';
import { DexScreenerToken, TokenData } from '../../types/token.types';

export class DexScreenerService {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;

  constructor() {
    this.client = axios.create({
      baseURL: config.apis.dexscreener,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    
    this.rateLimiter = new RateLimiter(config.rateLimits.dexscreener);
  }

  async searchTokens(query: string): Promise<TokenData[]> {
    return this.rateLimiter.execute(async () => {
      return retryWithBackoff(async () => {
        const response = await this.client.get(`/search`, {
          params: { q: query }
        });
        const pairs = response.data.pairs || [];
        
        logger.info(`DexScreener search '${query}' returned ${pairs.length} pairs`);
        
        return pairs
          .filter((pair: DexScreenerToken) => pair.chainId === 'solana')
          .map((pair: DexScreenerToken) => this.transformToken(pair));
      });
    });
  }

  async getTokenByAddress(address: string): Promise<TokenData | null> {
    return this.rateLimiter.execute(async () => {
      return retryWithBackoff(async () => {
        const response = await this.client.get(`/tokens/${address}`);
        const pairs = response.data.pairs || [];
        
        const solanaPairs = pairs.filter((p: DexScreenerToken) => p.chainId === 'solana');
        if (solanaPairs.length === 0) return null;
        
        return this.transformToken(solanaPairs[0]);
      });
    });
  }

  async getTrendingTokens(limit: number = 100): Promise<TokenData[]> {
    return this.rateLimiter.execute(async () => {
      return retryWithBackoff(async () => {
        try {
          // Strategy: Use multiple search approaches
          const searches = [
            { query: 'SOL', maxTokens: 30 },
            { query: 'pump.fun', maxTokens: 30 },
            { query: 'bonk', maxTokens: 20 },
            { query: 'WIF', maxTokens: 20 },
            { query: 'PEPE', maxTokens: 20 },
            { query: 'DOGE', maxTokens: 20 },
            { query: 'raydium', maxTokens: 20 },
          ];
          
          const allTokens: TokenData[] = [];
          const seenAddresses = new Set<string>();
          
          for (const { query, maxTokens } of searches) {
            try {
              logger.info(`Fetching DexScreener tokens for: "${query}"`);
              
              const response = await this.client.get(`/search`, {
                params: { q: query }
              });
              
              const pairs = response.data.pairs || [];
              logger.info(`  → Got ${pairs.length} total pairs`);
              
              // More lenient filters - just need some liquidity and volume
              const solanaPairs = pairs.filter((pair: DexScreenerToken) => 
                pair.chainId === 'solana' && 
                (pair.liquidity?.usd || 0) > 100 && // Lower liquidity threshold: $100
                (pair.volume?.h24 || 0) > 10 // Lower volume threshold: $10
              );
              
              logger.info(`  → ${solanaPairs.length} Solana pairs after filtering`);
              
              // Transform and deduplicate
              for (const pair of solanaPairs.slice(0, maxTokens)) {
                const address = pair.baseToken.address;
                if (!seenAddresses.has(address)) {
                  seenAddresses.add(address);
                  const token = this.transformToken(pair);
                  allTokens.push(token);
                }
              }
              
              // Rate limit delay between requests
              await new Promise(resolve => setTimeout(resolve, 250));
              
            } catch (error: any) {
              logger.warn(`DexScreener search failed for "${query}":`, error.message);
            }
          }
          
          logger.info(`DexScreener collected ${allTokens.length} unique tokens`);
          
          // Sort by volume and return top N
          return allTokens
            .sort((a, b) => b.volume_sol - a.volume_sol)
            .slice(0, limit);
            
        } catch (error: any) {
          logger.error('DexScreener getTrendingTokens error:', error.message);
          return [];
        }
      });
    });
  }

  private transformToken(pair: DexScreenerToken): TokenData {
    const SOL_PRICE_USD = 150; // Current approximate SOL price
    
    // Safely parse numeric values
    const priceInSol = parseFloat(pair.priceNative || '0') || 0;
    const volumeUsd = pair.volume?.h24 || 0;
    const liquidityUsd = pair.liquidity?.usd || 0;
    const fdv = pair.fdv || 0;

    return {
      token_address: pair.baseToken.address,
      token_name: pair.baseToken.name,
      token_ticker: pair.baseToken.symbol,
      price_sol: priceInSol,
      market_cap_sol: fdv / SOL_PRICE_USD,
      volume_sol: volumeUsd / SOL_PRICE_USD,
      liquidity_sol: liquidityUsd / SOL_PRICE_USD,
      transaction_count: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
      price_1hr_change: pair.priceChange?.h1 || 0,
      price_24hr_change: pair.priceChange?.h24 || 0,
      protocol: pair.dexId,
      last_updated: Date.now(),
    };
  }
}

export const dexScreenerService = new DexScreenerService();