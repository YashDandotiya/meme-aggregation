import { logger } from './logger';

export class RateLimiter {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;
  private lastExecutionTime = 0;
  private readonly minInterval: number;

  constructor(requestsPerSecond: number) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const now = Date.now();
    const timeSinceLastExecution = now - this.lastExecutionTime;

    if (timeSinceLastExecution < this.minInterval) {
      await this.sleep(this.minInterval - timeSinceLastExecution);
    }

    const task = this.queue.shift();
    if (task) {
      this.lastExecutionTime = Date.now();
      await task();
    }

    setImmediate(() => this.processQueue());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}