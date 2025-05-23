
import { RateLimitCategory, rateRegistry } from '../rateLimiter.ts';

// Enhanced Zoom API client with retries and rate limiting
export class ZoomApiClient {
  private readonly token: string;
  private readonly baseUrl: string = 'https://api.zoom.us/v2';
  private readonly maxRetries: number = 3;
  private readonly tokenRefreshCallback?: () => Promise<string>;
  
  constructor(token: string, tokenRefreshCallback?: () => Promise<string>) {
    this.token = token;
    this.tokenRefreshCallback = tokenRefreshCallback;
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
    
    // Set up default headers with initial token
    let currentToken = this.token;
    const getHeaders = () => ({
      'Authorization': `Bearer ${currentToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    });
    
    // Execute with rate limiting and retries
    return await rateRegistry.executeWithRateLimit(
      category,
      () => this.executeWithRetries(url, { ...options, headers: getHeaders() }, async (response) => {
        // If unauthorized and we have a refresh callback, try refreshing the token
        if (response.status === 401 && this.tokenRefreshCallback) {
          try {
            console.log('Token expired, attempting to refresh...');
            currentToken = await this.tokenRefreshCallback();
            console.log('Token refreshed successfully, retrying request');
            
            // Return true to indicate retry should happen
            return true;
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            // Return false to indicate retry should not happen
            return false;
          }
        }
        // Don't retry for non-401 errors
        return false;
      })
    );
  }
  
  /**
   * Execute a fetch request with exponential backoff retries
   */
  private async executeWithRetries(
    url: string,
    options: RequestInit,
    tokenRefreshHandler?: (response: Response) => Promise<boolean>
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
        
        // Handle 401 Unauthorized - could indicate token expiration
        if (response.status === 401 && tokenRefreshHandler) {
          try {
            const data = await response.json().catch(() => ({ message: 'Unknown auth error' }));
            console.error(`Authentication error: ${data.message || 'Unknown auth error'}`);
            
            // Check if it's a token expiration error
            if (data.message?.includes('expired') || 
                data.message?.includes('token') || 
                data.code === 124) {
              
              // Try refreshing token
              const shouldRetry = await tokenRefreshHandler(response);
              
              // If token refresh was successful, retry this attempt
              if (shouldRetry) {
                console.log(`Token refreshed, retrying attempt ${attempt}`);
                continue;
              }
              
              throw new Error(`Token expired: ${data.message}`);
            }
          } catch (tokenError) {
            // If we can't parse the response or the token refresh fails, continue with error handling
            throw tokenError;
          }
        } 
        else if (!response.ok) {
          // For non-401 errors, try to extract the error message
          try {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API error (${response.status}): ${errorData.message || response.statusText}`);
          } catch (e) {
            throw new Error(`API error (${response.status}): ${response.statusText}`);
          }
        }
        
        // Return the response for successful requests
        return response;
      } catch (error: any) {
        lastError = error;
        
        // Determine if this error is retryable
        const isRetryable = (
          error.name === 'AbortError' ||
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
  
  /**
   * Helper method to make a PATCH request
   */
  async patch(endpoint: string, body: any, options: RequestInit = {}): Promise<Response> {
    return this.request(
      endpoint,
      {
        ...options,
        method: 'PATCH',
        body: JSON.stringify(body)
      }
    );
  }
  
  /**
   * Helper method to make a DELETE request
   */
  async delete(endpoint: string, options: RequestInit = {}): Promise<Response> {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}
