import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { RateLimiter } from '../../utils/rateLimiter';
import { retryWithBackoff } from '../../utils/retry';
import { TokenData } from '../../types/token.types';

interface GeckoTerminalToken {
  id: string;
  type: string;
  attributes: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    total_supply: string;
    price_usd: string;
    fdv_usd: string;
    total_reserve_in_usd: string;
    volume_usd: {
      h24: string;
    };
    market_cap_usd: string | null;
  };
  relationships: {
    top_pools: {
      data: Array<{ id: string; type: string }>;
    };
  };
}

interface GeckoTerminalPool {
  id: string;
  type: string;
  attributes: {
    name: string;
    address: string;
    base_token_price_usd: string;
    quote_token_price_usd: string;
    base_token_price_native_currency: string;
    pool_created_at: string;
    reserve_in_usd: string;
    price_change_percentage: {
      h1: string;
      h24: string;
    };
    transactions: {
      h1: { buys: number; sells: number };
      h24: { buys: number; sells: number };
    };
    volume_usd: {
      h24: string;
    };
  };
}

export class GeckoTerminalService {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;

  constructor() {
    this.client = axios.create({
      baseURL: config.apis.geckoterminal,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    this.rateLimiter = new RateLimiter(
      config.rateLimits.geckoterminal || 10
    );
  }

  async getTrendingTokens(limit: number = 50): Promise<TokenData[]> {
    return this.rateLimiter.execute(async () => {
      return retryWithBackoff(async () => {
        try {
          const allTokens: TokenData[] = [];
          
          // Strategy 1: Get trending pools
          try {
            const trendingResponse = await this.client.get('/networks/solana/trending_pools');
            const trendingPools = trendingResponse.data.data || [];
            logger.info(`GeckoTerminal trending: ${trendingPools.length} pools`);
            
            for (const pool of trendingPools.slice(0, 30)) {
              const token = this.transformPool(pool);
              if (token) allTokens.push(token);
            }
          } catch (error: any) {
            logger.warn('GeckoTerminal trending failed:', error.message);
          }
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Strategy 2: Get newest pools (often where meme coins appear)
          try {
            const newPoolsResponse = await this.client.get('/networks/solana/new_pools');
            const newPools = newPoolsResponse.data.data || [];
            logger.info(`GeckoTerminal new pools: ${newPools.length} pools`);
            
            for (const pool of newPools.slice(0, 30)) {
              const token = this.transformPool(pool);
              if (token) allTokens.push(token);
            }
          } catch (error: any) {
            logger.warn('GeckoTerminal new pools failed:', error.message);
          }
          
          // Deduplicate by token address
          const uniqueTokens = Array.from(
            new Map(allTokens.map(token => [token.token_address, token])).values()
          );
          
          logger.info(`GeckoTerminal total: ${uniqueTokens.length} unique tokens`);
          
          return uniqueTokens.slice(0, limit);
        } catch (error: any) {
          logger.error('GeckoTerminal getTrendingTokens error:', error.message);
          return [];
        }
      });
    });
  }

  async searchTokens(query: string): Promise<TokenData[]> {
    return this.rateLimiter.execute(async () => {
      return retryWithBackoff(async () => {
        try {
          const response = await this.client.get('/search/pools', {
            params: {
              query,
              network: 'solana',
            },
          });
          
          const pools = response.data.data || [];
          
          return pools
            .slice(0, 20)
            .map((pool: GeckoTerminalPool) => this.transformPool(pool))
            .filter((token: TokenData | null): token is TokenData => token !== null);
        } catch (error: any) {
          logger.error('GeckoTerminal searchTokens error:', error.message);
          return [];
        }
      });
    });
  }

  private transformPool(pool: GeckoTerminalPool): TokenData | null {
    try {
      const attrs = pool.attributes;
      const SOL_PRICE_USD = 100; // Approximate
      
      // Extract base token address from pool address
      const poolAddress = attrs.address;
      const baseTokenPrice = parseFloat(attrs.base_token_price_native_currency) || 0;
      const volumeUsd = parseFloat(attrs.volume_usd?.h24 || '0');
      const liquidityUsd = parseFloat(attrs.reserve_in_usd || '0');
      
      // Parse price changes
      const priceChange1h = parseFloat(attrs.price_change_percentage?.h1 || '0');
      const priceChange24h = parseFloat(attrs.price_change_percentage?.h24 || '0');
      
      // Calculate transaction count
      const txCount = 
        (attrs.transactions?.h24?.buys || 0) + 
        (attrs.transactions?.h24?.sells || 0);

      return {
        token_address: poolAddress, // Using pool address as identifier
        token_name: attrs.name,
        token_ticker: attrs.name.split('/')[0].trim(), // Extract base token symbol
        price_sol: baseTokenPrice,
        market_cap_sol: 0, // Not directly available from pool data
        volume_sol: volumeUsd / SOL_PRICE_USD,
        liquidity_sol: liquidityUsd / SOL_PRICE_USD,
        transaction_count: txCount,
        price_1hr_change: priceChange1h,
        price_24hr_change: priceChange24h,
        protocol: 'geckoterminal',
        last_updated: Date.now(),
      };
    } catch (error) {
      logger.warn('Error transforming GeckoTerminal pool:', error);
      return null;
    }
  }
}

export const geckoTerminalService = new GeckoTerminalService();