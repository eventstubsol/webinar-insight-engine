
/**
 * Rate limiting implementation for Zoom API calls
 * Supports different categories of endpoints with varying rate limits
 */

export class Queue {
  private queue: (() => Promise<void>)[] = [];
  private processing = false;

  async enqueue(operation: () => Promise<void>): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(async () => {
        await operation();
        resolve();
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    try {
      const operation = this.queue.shift();
      if (operation) {
        await operation();
      }
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        // Continue processing queue
        this.processQueue();
      }
    }
  }
}

export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillTime: number;
  private lastRefill: number;
  
  constructor(maxTokens: number, refillTimeMs: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillTime = refillTimeMs;
    this.lastRefill = Date.now();
  }
  
  async waitForToken(): Promise<void> {
    this.refillTokens();
    
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    
    // Calculate time to wait for next token
    const timeToWait = this.refillTime - (Date.now() - this.lastRefill);
    await new Promise(resolve => setTimeout(resolve, Math.max(10, timeToWait)));
    
    // Try again after waiting
    return this.waitForToken();
  }
  
  private refillTokens() {
    const now = Date.now();
    const elapsedTime = now - this.lastRefill;
    const tokensToAdd = Math.floor(elapsedTime / this.refillTime) * this.maxTokens;
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}
