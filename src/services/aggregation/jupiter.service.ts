import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { RateLimiter } from '../../utils/rateLimiter';
import { retryWithBackoff } from '../../utils/retry';
import { JupiterPrice } from '../../types/token.types';

export class JupiterService {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;

  constructor() {
    this.client = axios.create({
      baseURL: config.apis.jupiter,
      timeout: 10000,
    });
    
    this.rateLimiter = new RateLimiter(config.rateLimits.jupiter);
  }

  async getPrices(tokenAddresses: string[]): Promise<Map<string, number>> {
    if (tokenAddresses.length === 0) return new Map();

    return this.rateLimiter.execute(async () => {
      return retryWithBackoff(async () => {
        const ids = tokenAddresses.join(',');
        const response = await this.client.get(`/price?ids=${ids}`);
        const data = response.data.data;

        const priceMap = new Map<string, number>();
        
        for (const [address, priceData] of Object.entries(data)) {
          const price = (priceData as any).price;
          if (price) {
            priceMap.set(address, price);
          }
        }

        return priceMap;
      });
    });
  }

  async getPrice(tokenAddress: string): Promise<number | null> {
    const prices = await this.getPrices([tokenAddress]);
    return prices.get(tokenAddress) || null;
  }
}

export const jupiterService = new JupiterService();