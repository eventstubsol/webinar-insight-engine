
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
    options: RequestInit,
    retryCount: number = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);
      
      // Check for rate limiting and retry with backoff
      if (response.status === 429 && retryCount < this.maxRetries) {
        // Get retry-after header or use exponential backoff
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? 
          parseInt(retryAfter, 10) * 1000 : 
          Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        
        console.log(`Rate limited. Retrying after ${waitTime}ms (retry ${retryCount + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.executeWithRetries(url, options, retryCount + 1);
      }
      
      // Check for auth issues (token expired)
      if (response.status === 401) {
        const errorData = await response.json();
        console.error('Zoom API error on', url, ':', errorData);
        throw new Error(`Access token is expired.`);
      }
      
      // Check for server errors and retry
      if (response.status >= 500 && retryCount < this.maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        console.log(`Server error (${response.status}). Retrying after ${waitTime}ms (retry ${retryCount + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.executeWithRetries(url, options, retryCount + 1);
      }
      
      return response;
    } catch (error) {
      // Handle network errors with retries
      if (retryCount < this.maxRetries && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('network') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT')
      )) {
        const waitTime = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        console.log(`Network error: ${error.message}. Retrying after ${waitTime}ms (retry ${retryCount + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.executeWithRetries(url, options, retryCount + 1);
      }
      
      throw error;
    }
  }
}

export default ZoomApiClient;
