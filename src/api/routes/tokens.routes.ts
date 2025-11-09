import { FastifyInstance } from 'fastify';
import { tokensController } from '../controllers/tokens.controller';

export async function tokensRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/tokens', tokensController.getTokens.bind(tokensController));
  
  fastify.get('/tokens/search', tokensController.searchTokens.bind(tokensController));
  
  fastify.get('/tokens/:address', tokensController.getTokenByAddress.bind(tokensController));
}