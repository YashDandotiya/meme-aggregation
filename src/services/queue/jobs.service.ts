import { logger } from '../../utils/logger';
import { aggregationService } from '../aggregation/aggregation.service';
import { webSocketService } from '../websocket/websocket.service';
import { redisService } from '../cache/redis.service';
import { TokenData } from '../../types/token.types';

export class JobsService {
  private intervals: NodeJS.Timeout[] = [];
  private previousTokenData = new Map<string, TokenData>();

  async startPeriodicJobs(): Promise<void> {
    logger.info('Starting periodic background jobs...');

    // Job 1: Refresh token data every 30 seconds
    const refreshInterval = setInterval(async () => {
      try {
        await this.refreshTokenData();
      } catch (error) {
        logger.error('Error in token refresh job:', error);
      }
    }, 30000); // 30 seconds

    // Job 2: Check for price updates and broadcast every 10 seconds
    const priceUpdateInterval = setInterval(async () => {
      try {
        await this.checkAndBroadcastPriceUpdates();
      } catch (error) {
        logger.error('Error in price update job:', error);
      }
    }, 10000); // 10 seconds

    // Job 3: Check for volume spikes every 15 seconds
    const volumeSpikeInterval = setInterval(async () => {
      try {
        await this.checkVolumeSpikes();
      } catch (error) {
        logger.error('Error in volume spike job:', error);
      }
    }, 15000); // 15 seconds

    this.intervals.push(refreshInterval, priceUpdateInterval, volumeSpikeInterval);

    // Run initial data fetch
    await this.refreshTokenData();

    logger.info('✓ Background jobs started successfully');
  }

  async stopJobs(): Promise<void> {
    logger.info('Stopping background jobs...');
    
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    
    this.intervals = [];
    logger.info('✓ Background jobs stopped');
  }

  private async refreshTokenData(): Promise<void> {
    logger.info('🔄 Refreshing token data...');
    
    try {
      const tokens = await aggregationService.fetchAndAggregateTokens();
      
      // Update previous data for comparison
      for (const token of tokens) {
        this.previousTokenData.set(token.token_address, token);
      }
      
      logger.info(`✓ Refreshed ${tokens.length} tokens`);
    } catch (error) {
      logger.error('Failed to refresh token data:', error);
    }
  }

  private async checkAndBroadcastPriceUpdates(): Promise<void> {
    if (webSocketService.getConnectionCount() === 0) {
      return; // Skip if no WebSocket connections
    }

    try {
      // Get top 20 tokens by volume
      const tokens = await aggregationService.getTokens(20, 'volume', '24h');
      
      for (const token of tokens) {
        const previous = this.previousTokenData.get(token.token_address);
        
        if (previous) {
          const priceChangePercent = ((token.price_sol - previous.price_sol) / previous.price_sol) * 100;
          
          // Broadcast if price changed by more than 1%
          if (Math.abs(priceChangePercent) > 1) {
            webSocketService.broadcastPriceUpdate(token.token_address, token);
            logger.debug(`📊 Price update: ${token.token_ticker} ${priceChangePercent > 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%`);
          }
        }
      }
    } catch (error) {
      logger.error('Error checking price updates:', error);
    }
  }

  private async checkVolumeSpikes(): Promise<void> {
    if (webSocketService.getConnectionCount() === 0) {
      return; // Skip if no WebSocket connections
    }

    try {
      const tokens = await aggregationService.getTokens(50, 'volume', '24h');
      
      for (const token of tokens) {
        const previous = this.previousTokenData.get(token.token_address);
        
        if (previous && previous.volume_sol > 0) {
          const volumeChangePercent = ((token.volume_sol - previous.volume_sol) / previous.volume_sol) * 100;
          
          // Broadcast if volume spiked by more than 50%
          if (volumeChangePercent > 50) {
            webSocketService.broadcastVolumeSpike(
              token.token_address,
              previous.volume_sol,
              token.volume_sol
            );
            logger.info(`🚀 Volume spike: ${token.token_ticker} +${volumeChangePercent.toFixed(2)}%`);
          }
        }
      }
    } catch (error) {
      logger.error('Error checking volume spikes:', error);
    }
  }
}

export const jobsService = new JobsService();