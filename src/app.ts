import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './api/middleware/errorHandler';
import { tokensRoutes } from './api/routes/tokens.routes';
import { healthRoutes } from './api/routes/health.routes';
import { webSocketService } from './services/websocket/websocket.service';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
  },
});

  // Register plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(websocket);

  // Error handler
  fastify.setErrorHandler(async (error, request, reply) => {
  await errorHandler(error, request, reply);
});

  // Health check routes
  await fastify.register(healthRoutes);

  // API routes
  await fastify.register(tokensRoutes, { prefix: '/api' });

  // WebSocket initialization
  webSocketService.initialize(fastify);

  return fastify;
}