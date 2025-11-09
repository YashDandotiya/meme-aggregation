import { FastifyInstance } from 'fastify';
import { healthController } from '../controllers/health.controller';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', healthController.healthCheck.bind(healthController));
  
  fastify.get('/metrics', healthController.metrics.bind(healthController));
}
