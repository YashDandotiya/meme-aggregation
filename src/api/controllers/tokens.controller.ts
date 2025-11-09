import { FastifyRequest, FastifyReply } from 'fastify';
import { aggregationService } from '../../services/aggregation/aggregation.service';
import { logger } from '../../utils/logger';
import { SortField, TimeFrame } from '../../types/token.types';

interface TokensQueryParams {
  limit?: number;
  cursor?: string;
  sort?: SortField;
  timeframe?: TimeFrame;
}

interface SearchQueryParams {
  q: string;
}

interface TokenParams {
  address: string;
}

export class TokensController {
  async getTokens(
    request: FastifyRequest<{ Querystring: TokensQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { limit = 20, sort = 'volume', timeframe = '24h' } = request.query;

      const tokens = await aggregationService.getTokens(
        Math.min(limit, 100),
        sort,
        timeframe
      );

      reply.send({
        success: true,
        data: tokens,
        count: tokens.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error in getTokens:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch tokens',
      });
    }
  }

  async searchTokens(
    request: FastifyRequest<{ Querystring: SearchQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { q } = request.query;

      if (!q || q.length < 2) {
        return reply.status(400).send({
          success: false,
          error: 'Query must be at least 2 characters',
        });
      }

      const tokens = await aggregationService.searchTokens(q);

      reply.send({
        success: true,
        data: tokens,
        count: tokens.length,
        query: q,
      });
    } catch (error) {
      logger.error('Error in searchTokens:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to search tokens',
      });
    }
  }

  async getTokenByAddress(
    request: FastifyRequest<{ Params: TokenParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { address } = request.params;

      const token = await aggregationService.getTokenByAddress(address);

      if (!token) {
        return reply.status(404).send({
          success: false,
          error: 'Token not found',
        });
      }

      reply.send({
        success: true,
        data: token,
      });
    } catch (error) {
      logger.error('Error in getTokenByAddress:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch token',
      });
      
    }
  }
}

export const tokensController = new TokensController();