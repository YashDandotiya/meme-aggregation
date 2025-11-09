import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

// Mock the entire dexscreener service module
jest.mock('../../src/services/aggregation/dexscreener.service', () => ({
  dexScreenerService: {
    getTrendingTokens: jest.fn().mockResolvedValue([]),
    searchTokens: jest.fn().mockResolvedValue([
      {
        token_address: 'mock_address_1',
        name: 'PIPE Token',
        symbol: 'PIPE',
        price_sol: 0.5,
        volume_sol: 1000,
        market_cap_sol: 50000,
        liquidity_sol: 10000,
        price_1hr_change: 5.2,
        price_24hr_change: 12.5,
        holders: 500,
        source: 'dexscreener',
        last_updated: Date.now(),
      },
    ]),
    getTokenByAddress: jest.fn().mockResolvedValue(null), // Returns null for invalid address
  },
}));

describe('API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.status).toBe('healthy');
    });
  });

  describe('GET /api/tokens', () => {
    it('should return tokens list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens?limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    }, 30000);

    it('should respect limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens?limit=5',
      });

      const body = JSON.parse(response.body);
      expect(body.data.length).toBeLessThanOrEqual(5);
    });

    it('should support sorting', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens?sort=volume&limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Check if sorted by volume
      for (let i = 0; i < body.data.length - 1; i++) {
        expect(body.data[i].volume_sol).toBeGreaterThanOrEqual(
          body.data[i + 1].volume_sol
        );
      }
    });
  });

  describe('GET /api/tokens/search', () => {
    it('should search for tokens', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens/search?q=PIPE',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('should reject short queries', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens/search?q=P',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/tokens/:address', () => {
    it('should return 404 for non-existent token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tokens/invalid_address_123',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Token not found');
    });
  });
});