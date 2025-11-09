import { FastifyRequest, FastifyReply } from 'fastify';
import { redisService } from '../../services/cache/redis.service';
import { webSocketService } from '../../services/websocket/websocket.service';
import { logger } from '../../utils/logger';

export class HealthController {
  async healthCheck(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Check Redis connection
      const redisHealthy = await redisService.exists('health:check');
      await redisService.set('health:check', 'ok', 10);

      const wsConnections = webSocketService.getConnectionCount();

      reply.send({
        success: true,
        status: 'healthy',
        timestamp: Date.now(),
        services: {
          redis: redisHealthy ? 'connected' : 'disconnected',
          websocket: `${wsConnections} connections`,
        },
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      reply.status(503).send({
        success: false,
        status: 'unhealthy',
        error: 'Service unavailable',
      });
    }
  }

  async metrics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const wsConnections = webSocketService.getConnectionCount();

    reply.send({
      success: true,
      metrics: {
        websocket_connections: wsConnections,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    });
  }
}

export const healthController = new HealthController();