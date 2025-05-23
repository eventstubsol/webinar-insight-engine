
/**
 * Enhanced rate limiting for Zoom API calls with better categorization
 * and endpoint-specific limits
 */

// Zoom API has different rate limits for different types of endpoints
export enum RateLimitCategory {
  LIGHT = 'light',     // 90 requests/sec
  MEDIUM = 'medium',   // 10 requests/sec
  HEAVY = 'heavy',     // 1 request/sec
  BACKGROUND = 'background' // 0.2 requests/sec (very heavy operations)
}

// Rate limit configuration for each category
const RATE_LIMITS: Record<RateLimitCategory, { tokensPerSecond: number, burstSize: number }> = {
  [RateLimitCategory.LIGHT]: { tokensPerSecond: 5, burstSize: 15 },     // Conservative limits
  [RateLimitCategory.MEDIUM]: { tokensPerSecond: 2, burstSize: 5 },
  [RateLimitCategory.HEAVY]: { tokensPerSecond: 0.5, burstSize: 2 },    // 1 per 2 seconds
  [RateLimitCategory.BACKGROUND]: { tokensPerSecond: 0.1, burstSize: 1 } // 1 per 10 seconds
};

// Queue implementation for sequential processing
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
  
  // Get queue length for diagnostics
  getQueueLength(): number {
    return this.queue.length;
  }
}

// Token bucket algorithm for rate limiting
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private tokensPerMs: number;
  private lastRefill: number;
  private waiting: number = 0;
  
  constructor(tokensPerSecond: number, burstSize: number) {
    this.maxTokens = burstSize;
    this.tokens = burstSize; // Start with a full bucket
    this.tokensPerMs = tokensPerSecond / 1000;
    this.lastRefill = Date.now();
  }
  
  // Wait for token availability with timeout
  async waitForToken(timeoutMs: number = 30000): Promise<boolean> {
    this.refillTokens();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    // Calculate time to wait for next token
    const msToNextToken = (1 - this.tokens) / this.tokensPerMs;
    
    // Check if wait time exceeds timeout
    if (msToNextToken > timeoutMs) {
      console.warn(`Rate limit wait time (${msToNextToken.toFixed(0)}ms) exceeds timeout (${timeoutMs}ms)`);
      return false;
    }
    
    this.waiting++;
    
    try {
      // Wait for token refill
      await new Promise(resolve => setTimeout(resolve, Math.max(10, msToNextToken)));
      
      // Try again after waiting (recursive call with same timeout)
      this.refillTokens();
      
      // Reduce token after successful wait
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return true;
      }
      
      // If still no tokens, give up
      return false;
    } finally {
      this.waiting--;
    }
  }
  
  // Refill tokens based on elapsed time
  private refillTokens() {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    
    if (elapsedMs > 0) {
      // Calculate tokens to add based on elapsed time
      const newTokens = elapsedMs * this.tokensPerMs;
      
      if (newTokens > 0) {
        this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
        this.lastRefill = now;
      }
    }
  }
  
  // Get status for diagnostics
  getStatus() {
    this.refillTokens();
    return {
      availableTokens: this.tokens,
      maxTokens: this.maxTokens,
      tokensPerSecond: this.tokensPerMs * 1000,
      waiting: this.waiting
    };
  }
}

// Registry to manage rate limiters for different categories
export class RateLimiterRegistry {
  private limiters: Map<RateLimitCategory, RateLimiter> = new Map();
  private queues: Map<RateLimitCategory, Queue> = new Map();
  
  constructor() {
    // Initialize limiters for all categories
    Object.values(RateLimitCategory).forEach(category => {
      const config = RATE_LIMITS[category];
      this.limiters.set(category, new RateLimiter(config.tokensPerSecond, config.burstSize));
      this.queues.set(category, new Queue());
    });
  }
  
  // Execute an operation with rate limiting
  async executeWithRateLimit<T>(
    category: RateLimitCategory,
    operation: () => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    const limiter = this.limiters.get(category)!;
    const queue = this.queues.get(category)!;
    
    // Use queue for sequential execution within a category
    return new Promise((resolve, reject) => {
      queue.enqueue(async () => {
        // Wait for token availability
        const acquired = await limiter.waitForToken(timeoutMs);
        
        if (!acquired) {
          reject(new Error(`Rate limit exceeded for ${category} operation`));
          return;
        }
        
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }
  
  // Get status for diagnostics
  getStatus() {
    const status: Record<string, any> = {};
    Object.values(RateLimitCategory).forEach(category => {
      const limiter = this.limiters.get(category)!;
      const queue = this.queues.get(category)!;
      
      status[category] = {
        ...limiter.getStatus(),
        queueLength: queue.getQueueLength()
      };
    });
    return status;
  }
}

// Global registry instance
export const rateRegistry = new RateLimiterRegistry();
