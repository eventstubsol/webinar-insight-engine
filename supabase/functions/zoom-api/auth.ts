
import { tokenCache } from './cacheUtils.ts';
import { RateLimiter, Queue } from './rateLimiter.ts';

// Rate limiter instances for different API categories
const rateLimiters = {
  light: new RateLimiter(100, 1000),   // 100/second
  medium: new RateLimiter(10, 1000),   // 10/second
  heavy: new RateLimiter(5, 1000),     // 5/second
  resource: new RateLimiter(1, 1000)   // 1/second
};

// Request queues for each category
const requestQueues = {
  light: new Queue(),
  medium: new Queue(),
  heavy: new Queue(),
  resource: new Queue()
};

// Generate a Server-to-Server OAuth access token
export async function getZoomJwtToken(accountId: string, clientId: string, clientSecret: string) {
  // For a specific user, create a cache key
  const cacheKey = `${accountId}:${clientId}`; 
  
  // Check cache first
  const cachedToken = tokenCache.get(cacheKey);
  if (cachedToken && cachedToken.expires > Date.now()) {
    console.log('Using cached Zoom token');
    return cachedToken.token;
  }

  // Validate Account ID format
  if (typeof accountId !== 'string' || accountId.trim() === '') {
    console.error(`Invalid Account ID format: ${accountId}`);
    throw new Error('Zoom Account ID is invalid or empty');
  }

  try {
    console.log(`Requesting Zoom token with account_credentials grant type for account ID starting with ${accountId.substring(0, 4)}...`);
    
    // Build the token URL with parameters
    const tokenUrl = new URL('https://zoom.us/oauth/token');
    tokenUrl.searchParams.append('grant_type', 'account_credentials');
    tokenUrl.searchParams.append('account_id', accountId);
    
    // Create authorization header with base64 encoded client_id:client_secret
    const authHeader = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    
    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    // Log response status for debugging
    console.log('Token response status:', tokenResponse.status, tokenResponse.statusText);
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Zoom token error response:', tokenData);
      
      // Provide more specific error messages based on error types
      if (tokenData.error === 'invalid_client') {
        throw new Error('Zoom API authentication failed: Invalid client credentials (Client ID or Client Secret)');
      } else if (tokenData.error === 'invalid_grant') {
        throw new Error('Zoom API authentication failed: Invalid Account ID or insufficient permissions');
      } else {
        throw new Error(`Failed to get Zoom token: ${tokenData.error || 'Unknown error'} - ${tokenData.error_description || ''}`);
      }
    }

    // Cache the token (expires in seconds from now)
    const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour if not specified
    tokenCache.set(cacheKey, {
      token: tokenData.access_token,
      expires: Date.now() + (expiresIn * 1000) - 60000 // Expire 1 minute early to be safe
    });

    console.log('Successfully obtained Zoom access token');
    return tokenData.access_token;
  } catch (error) {
    console.error('Zoom JWT generation error:', error);
    throw error;
  }
}

/**
 * Enhanced API client that handles rate limiting and retries
 */
export class ZoomApiClient {
  private baseUrl = 'https://api.zoom.us/v2';
  
  constructor(private accessToken: string) {}
  
  /**
   * Makes a rate-limited request to the Zoom API
   * 
   * @param endpoint - API endpoint path (e.g., "/users/me/webinars")
   * @param options - Request options
   * @param category - Rate limit category (light, medium, heavy, resource)
   * @returns Promise with the API response
   */
  async request(
    endpoint: string, 
    options: RequestInit = {}, 
    category: 'light' | 'medium' | 'heavy' | 'resource' = 'medium'
  ): Promise<Response> {
    const limiter = rateLimiters[category];
    const queue = requestQueues[category];
    
    let response: Response | null = null;
    
    // Queue this operation with rate limiting
    await queue.enqueue(async () => {
      // Wait for a token from the rate limiter
      await limiter.waitForToken();
      
      // Make the actual API request
      const requestOptions: RequestInit = {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      };
      
      try {
        response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);
        
        // Handle rate limiting response
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          console.log(`Rate limited by Zoom API. Retrying after ${retryAfter} seconds.`);
          await this.exponentialBackoff(retryAfter);
          
          // Try the request again after waiting
          response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);
        }
      } catch (error) {
        console.error(`API request to ${endpoint} failed:`, error);
        throw error;
      }
    });
    
    if (!response) {
      throw new Error('Request failed to execute');
    }
    
    return response;
  }
  
  /**
   * Implements exponential backoff for retries
   */
  private async exponentialBackoff(baseDelay: number, attempt: number = 1): Promise<void> {
    const maxDelay = 300; // Maximum delay of 5 minutes
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    console.log(`Backing off for ${delay} seconds before retry`);
    await new Promise(resolve => setTimeout(resolve, delay * 1000));
  }
}
