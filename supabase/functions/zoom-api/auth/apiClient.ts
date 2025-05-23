
import { RateLimitCategory, rateRegistry } from '../rateLimiter.ts';

// Enhanced Zoom API client with retries and rate limiting
export class ZoomApiClient {
  private readonly token: string;
  private readonly baseUrl: string = 'https://api.zoom.us/v2';
  private readonly maxRetries: number = 3;
  
  constructor(token: string) {
    this.token = token;
  }
  
  /**
   * Makes authenticated requests to the Zoom API with rate limiting and retries
   */
  async request(
    endpoint: string, 
    options: RequestInit = {},
    categoryOverride?: RateLimitCategory
  ): Promise<Response> {
    // Default to MEDIUM category if not specified
    const category = categoryOverride || RateLimitCategory.MEDIUM;
    
    // Determine full URL
    const url = `${this.baseUrl}${endpoint}`;
    
    // Set up default headers
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Execute with rate limiting and retries
    return await rateRegistry.executeWithRateLimit(
      category,
      () => this.executeWithRetries(url, { ...options, headers })
    );
  }
  
  /**
   * Execute a fetch request with exponential backoff retries
   */
  private async executeWithRetries(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    let lastError: Error | null = null;
    
    // Try up to maxRetries times
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // If not the first attempt, add some exponential backoff delay
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`Retry attempt ${attempt}/${this.maxRetries} for ${url}, waiting ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Make the request
        const response = await fetch(url, options);
        
        // Special handling for 401 Unauthorized - could indicate token expiry
        if (response.status === 401) {
          const data = await response.json();
          console.error(`Authentication error: ${data.message || 'Unknown auth error'}`);
          
          // Check if it's a token expiration error
          if (data.message?.includes('expired') || data.message?.includes('token') || data.code === 124) {
            throw new Error(`Token expired: ${data.message}`);
          }
        }
        
        // Return the response regardless of status - the caller will handle different statuses
        return response;
      } catch (error: any) {
        lastError = error;
        
        // Determine if this error is retryable
        const isRetryable = (
          error.message?.includes('network') ||
          error.message?.includes('timeout') ||
          error.message?.includes('fetch failed') ||
          error.message?.includes('connection') ||
          error.message?.includes('ECONNRESET') ||
          error.message?.includes('ETIMEDOUT') ||
          error.message?.includes('socket hang up')
        );
        
        // If we've used all retries or the error isn't retryable, break out of the loop
        if (attempt >= this.maxRetries || !isRetryable) {
          console.log(`Giving up after attempt ${attempt + 1}/${this.maxRetries + 1}: ${error.message}`);
          break;
        }
        
        console.log(`Request failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${error.message}`);
      }
    }
    
    // If we got here, all retries failed
    throw lastError || new Error(`Request failed after ${this.maxRetries} retries`);
  }
  
  /**
   * Helper method to make a GET request
   */
  async get(endpoint: string, options: RequestInit = {}): Promise<Response> {
    return this.request(endpoint, { ...options, method: 'GET' });
  }
  
  /**
   * Helper method to make a POST request
   */
  async post(endpoint: string, body: any, options: RequestInit = {}): Promise<Response> {
    return this.request(
      endpoint, 
      { 
        ...options, 
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
  }
}
