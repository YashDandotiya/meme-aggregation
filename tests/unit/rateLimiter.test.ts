import { RateLimiter } from '../../src/utils/rateLimiter';

describe('RateLimiter', () => {
  it('should limit requests per second', async () => {
    const limiter = new RateLimiter(2); // 2 req/sec
    const startTime = Date.now();
    
    const promises = [
      limiter.execute(async () => 1),
      limiter.execute(async () => 2),
      limiter.execute(async () => 3),
    ];
    
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    // Should take at least 500ms for 3 requests at 2 req/sec
    expect(duration).toBeGreaterThanOrEqual(500);
  });

  it('should execute functions in order', async () => {
    const limiter = new RateLimiter(10);
    const results: number[] = [];
    
    const promises = [
      limiter.execute(async () => results.push(1)),
      limiter.execute(async () => results.push(2)),
      limiter.execute(async () => results.push(3)),
    ];
    
    await Promise.all(promises);
    expect(results).toEqual([1, 2, 3]);
  });
});