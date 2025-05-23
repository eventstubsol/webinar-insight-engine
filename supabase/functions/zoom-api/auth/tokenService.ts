
import { CircuitState, circuitRegistry } from '../circuitBreaker.ts';

// Default retry configuration
const TOKEN_REQUEST_TIMEOUT = 10000; // 10 seconds
const TOKEN_MAX_RETRIES = 3;

// Cache for token expiration
const tokenCache: Map<string, { token: string, expiresAt: number }> = new Map();

/**
 * Get JWT token for Zoom API access with caching and resilience
 */
export async function getZoomJwtToken(
  accountId: string,
  clientId: string,
  clientSecret: string
): Promise<any> {
  // Create a cache key based on credentials
  const cacheKey = `${accountId}:${clientId}`;
  
  // Check circuit breaker
  const circuitBreaker = circuitRegistry.getBreaker('zoomToken');
  if (!circuitBreaker.canRequest()) {
    throw new Error('Token service temporarily unavailable due to previous failures');
  }
  
  // Check cache first
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60000) { // 1-minute buffer
    return { access_token: cached.token, expires_in: Math.floor((cached.expiresAt - Date.now()) / 1000) };
  }
  
  try {
    // Validate inputs
    if (!accountId || !clientId || !clientSecret) {
      throw new Error('Missing required Zoom credentials (account_id, client_id, or client_secret)');
    }
    
    // Request new token
    const tokenResponse = await requestToken(accountId, clientId, clientSecret);
    
    // Validate response
    if (!tokenResponse.access_token) {
      throw new Error('Invalid token response from Zoom API');
    }
    
    // Calculate token expiration (default to 1 hour if not provided)
    const expiresIn = tokenResponse.expires_in || 3600;
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    // Cache the token
    tokenCache.set(cacheKey, {
      token: tokenResponse.access_token,
      expiresAt
    });
    
    // Record success in circuit breaker
    circuitBreaker.recordSuccess();
    
    console.log('Successfully retrieved new access token');
    return tokenResponse;
  } catch (error) {
    // Record failure in circuit breaker
    circuitBreaker.recordFailure();
    
    // Enhance error message based on the error
    if (error.message?.includes('client_id') || error.message?.includes('client_secret')) {
      throw new Error('Invalid client_id or client_secret');
    } else if (error.message?.includes('account_id')) {
      throw new Error('Invalid account_id');
    } else if (error.message?.includes('rate limit')) {
      throw new Error('Rate limit exceeded when requesting token');
    }
    
    throw error;
  }
}

/**
 * Make the actual token request with retries
 */
async function requestToken(
  accountId: string,
  clientId: string,
  clientSecret: string,
  retryCount: number = 0
): Promise<any> {
  try {
    // Create the token request
    const tokenUrl = 'https://zoom.us/oauth/token';
    const authHeader = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TOKEN_REQUEST_TIMEOUT);
    
    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': authHeader
        },
        body: `grant_type=account_credentials&account_id=${accountId}`,
        signal: controller.signal
      });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Handle non-200 responses
      if (!response.ok) {
        const errorData = await response.json();
        
        // Specific error handling based on response
        if (response.status === 429) {
          throw new Error('Rate limit exceeded when requesting token');
        } else if (response.status === 401) {
          throw new Error('Invalid client_id or client_secret');
        } else if (response.status === 400 && errorData.error === 'invalid_grant') {
          throw new Error('Invalid account_id');
        }
        
        throw new Error(`Token request failed: ${errorData.error_description || errorData.error || response.statusText}`);
      }
      
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    // Retry on network errors or timeouts
    if (retryCount < TOKEN_MAX_RETRIES && (
      error.name === 'AbortError' ||
      error.message?.includes('network') ||
      error.message?.includes('fetch')
    )) {
      const waitTime = Math.pow(2, retryCount) * 1000;
      console.log(`Token request failed, retrying in ${waitTime}ms: ${error.message}`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return requestToken(accountId, clientId, clientSecret, retryCount + 1);
    }
    
    throw error;
  }
}

export default getZoomJwtToken;
