import { retryWithBackoff } from '../../src/utils/retry';

describe('retryWithBackoff', () => {
  it('should succeed on first try', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    
    const result = await retryWithBackoff(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    let callCount = 0;
    const fn = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject({ response: { status: 429 } });
      }
      return Promise.resolve('success');
    });
    
    const result = await retryWithBackoff(fn, {
      maxRetries: 2,
      baseDelay: 10,
      maxDelay: 100,
    });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries', async () => {
    const fn = jest.fn().mockImplementation(() => {
      return Promise.reject({ response: { status: 429 } });
    });
    
    await expect(
      retryWithBackoff(fn, {
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100,
      })
    ).rejects.toMatchObject({ response: { status: 429 } });
    
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});