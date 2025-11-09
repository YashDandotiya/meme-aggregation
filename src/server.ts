import { buildApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { jobsService } from './services/queue/jobs.service';
import { redisService } from './services/cache/redis.service';

async function start(): Promise<void> {
  try {
    const app = await buildApp();

    // Start background jobs
    await jobsService.startPeriodicJobs();

    // Start server
    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    logger.info(`🚀 Server running on http://localhost:${config.port}`);
    logger.info(`📊 WebSocket available at ws://localhost:${config.port}/ws`);
    logger.info(`🔍 API Docs: http://localhost:${config.port}/api/tokens`);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      await jobsService.stopJobs();
      await app.close();
      await redisService.disconnect();
      
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();