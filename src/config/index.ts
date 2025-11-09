import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '30', 10),
  },
  
  rateLimits: {
    dexscreener: parseInt(process.env.DEXSCREENER_RATE_LIMIT || '5', 10),
    jupiter: parseInt(process.env.JUPITER_RATE_LIMIT || '10', 10),
    geckoterminal: parseInt(process.env.GECKOTERMINAL_RATE_LIMIT || '10', 10),
  },
  
  apis: {
    dexscreener: process.env.DEXSCREENER_BASE_URL || 'https://api.dexscreener.com/latest/dex',
    jupiter: process.env.JUPITER_BASE_URL || 'https://price.jup.ag/v4',
    geckoterminal: process.env.GECKOTERMINAL_BASE_URL || 'https://api.geckoterminal.com/api/v2',
  },
};