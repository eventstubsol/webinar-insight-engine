
import { getZoomJwtToken } from '../auth/tokenService.ts';
import { updateCredentialsVerification } from './storage.ts';
import { corsHeaders, createErrorResponse, createSuccessResponse } from '../cors.ts';

// Custom error types for better error handling
export class ZoomAPIError extends Error {
  status: number;
  code: string;
  
  constructor(message: string, status = 400, code = 'zoom_api_error') {
    super(message);
    this.name = 'ZoomAPIError';
    this.status = status;
    this.code = code;
  }
}

export class ZoomNetworkError extends ZoomAPIError {
  constructor(message: string) {
    super(message, 503, 'network_error');
    this.name = 'ZoomNetworkError';
  }
}

export class ZoomAuthenticationError extends ZoomAPIError {
  constructor(message: string) {
    super(message, 401, 'authentication_error');
    this.name = 'ZoomAuthenticationError';
  }
}

export class ZoomScopesError extends ZoomAPIError {
  constructor(message: string) {
    super(message, 403, 'missing_scopes');
    this.name = 'ZoomScopesError';
  }
}

export class ZoomRateLimitError extends ZoomAPIError {
  constructor(message: string) {
    super(message, 429, 'rate_limit_exceeded');
    this.name = 'ZoomRateLimitError';
  }
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
  retryableErrors: string[];
}

// Improved retry configuration with more comprehensive retryable errors and statuses
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,               // Increased from 3 to 5
  baseDelay: 1000,             // Increased from 500ms to 1000ms
  maxDelay: 10000,             // Increased from 5000ms to 10000ms
  retryableStatuses: [408, 425, 429, 500, 502, 503, 504],  // Added 408 (Request Timeout) and 425 (Too Early)
  retryableErrors: [
    'network', 'timeout', 'connection', 'ECONNRESET', 'ETIMEDOUT', 
    'fetch failed', 'aborted', 'socket hang up', 'ERR_INSUFFICIENT_RESOURCES'
  ]
};

// Helper function to determine if an error is retryable
function isRetryable(error: any, config: RetryConfig): boolean {
  if (!error) return false;
  
  // Check HTTP status code
  if (error.status && config.retryableStatuses.includes(error.status)) {
    return true;
  }
  
  // Check error message for known patterns
  if (error.message) {
    const message = error.message.toLowerCase();
    return config.retryableErrors.some(term => message.includes(term.toLowerCase()));
  }
  
  return false;
}

// Calculate delay with exponential backoff and jitter
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  
  // Apply maximum delay cap
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  // Add jitter to prevent thundering herd problem (±25% randomness)
  const jitterFactor = 0.75 + (Math.random() * 0.5);
  
  return Math.floor(cappedDelay * jitterFactor);
}

// Enhanced retry logic with improved logging and error handling
async function withRetry<T>(
  operation: () => Promise<T>, 
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: any;
  let attempt = 0;
  
  while (attempt <= config.maxRetries) {
    try {
      // Add more detailed logging
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${config.maxRetries}`);
      }
      
      // Add timing information
      const startTime = Date.now();
      const result = await operation();
      const endTime = Date.now();
      console.log(`Operation completed in ${endTime - startTime}ms`);
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Enhanced error logging
      console.log(
        `Operation failed on attempt ${attempt + 1}/${config.maxRetries + 1}: ${error.message || 'Unknown error'}`,
        error.stack ? `\nStack: ${error.stack}` : ''
      );
      
      // Check if we've used all retries
      if (attempt >= config.maxRetries) {
        console.log('Maximum retries reached, giving up');
        break;
      }
      
      // Only retry if the error is considered retryable
      if (isRetryable(error, config)) {
        const delay = calculateBackoffDelay(attempt, config);
        console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
        continue;
      } else {
        console.log('Error is not retryable, giving up');
        break;
      }
    }
  }
  
  // Improved error type conversion with more context
  if (lastError) {
    const errorDetails = lastError.stack || '';
    
    if (lastError.status === 429 || lastError.message?.includes('rate limit')) {
      throw new ZoomRateLimitError(`Rate limit exceeded. ${errorDetails}`);
    } else if (lastError.message?.includes('network') || 
               lastError.message?.includes('timed out') ||
               lastError.message?.includes('connection')) {
      throw new ZoomNetworkError(`Network error: ${lastError.message}. ${errorDetails}`);
    } else if (lastError.message?.includes('Invalid client') || 
               lastError.message?.includes('Invalid account') || 
               lastError.message?.includes('client_secret')) {
      throw new ZoomAuthenticationError(`Authentication error: ${lastError.message}. ${errorDetails}`);
    } else if (lastError.message?.includes('scopes')) {
      throw new ZoomScopesError(`${lastError.message}. ${errorDetails}`);
    }
  }
  
  throw lastError || new ZoomAPIError('Operation failed after retries');
}

// Verify that Zoom credentials are valid
export async function verifyZoomCredentials(credentials: any) {
  if (!credentials) {
    throw new ZoomAPIError('Credentials are required');
  }
  
  try {
    console.log('Verifying Zoom credentials...');
    
    // If we already have a valid token, use it
    if (credentials.access_token) {
      console.log('Using existing access token');
      return credentials.access_token;
    }
    
    console.log('No existing token found, requesting new token...');
    
    // Get a new token with enhanced retry logic
    const token = await withRetry(() => getZoomJwtToken(
      credentials.account_id,
      credentials.client_id,
      credentials.client_secret
    ));
    
    console.log('Successfully obtained token');
    
    // If we got here, the credentials are valid
    return token;
  } catch (error) {
    console.error('Zoom credential verification failed:', error);
    
    // Error has already been converted to the appropriate type in withRetry
    if (error instanceof ZoomAPIError) {
      throw error;
    }
    
    // Enhanced error message based on the type of error
    if (error.message?.includes('Invalid client_id or client_secret')) {
      throw new ZoomAuthenticationError('Invalid client ID or client secret. Please check your credentials.');
    } else if (error.message?.includes('Invalid account_id')) {
      throw new ZoomAuthenticationError('Invalid account ID. Please check your Zoom account ID.');
    }
    
    // Generic error
    throw new ZoomAPIError(`Invalid Zoom credentials: ${error.message || 'Unknown error'}`);
  }
}

// Test OAuth scopes to ensure all required ones are present
export async function testOAuthScopes(token: string) {
  console.log('Testing API scopes with a simple request...');
  
  // List of expected scopes for clarity
  const requiredScopes = [
    'user:read:user:admin', 
    'user:read:user:master', 
    'webinar:read:webinar:admin', 
    'webinar:write:webinar:admin'
  ];
  
  try {
    // Enhanced retry config for scope testing
    const scopeRetryConfig: RetryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: 2,  // Fewer retries for scope testing
      baseDelay: 300  // Shorter base delay
    };
    
    // Use enhanced retry logic for API call
    const scopeTestResponse = await withRetry(
      () => fetch('https://api.zoom.us/v2/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }), 
      scopeRetryConfig
    );
    
    if (!scopeTestResponse.ok) {
      const scopeTestData = await scopeTestResponse.json();
      console.error('Scope test failed:', scopeTestData);
      
      // Enhanced error message for missing scopes
      if (scopeTestData.code === 4711 || scopeTestData.message?.includes('scopes')) {
        throw new ZoomScopesError(
          `Your Zoom Server-to-Server OAuth app is missing required scopes. ` +
          `Please add these scopes to your Zoom app: ${requiredScopes.join(', ')}`
        );
      }
      
      // Handle other API errors
      if (scopeTestData.code === 429) {
        throw new ZoomRateLimitError('Zoom API rate limit exceeded. Please try again later.');
      } else if (scopeTestData.code >= 500) {
        throw new ZoomAPIError('Zoom API server error. Please try again later.', 502, 'server_error');
      }
      
      throw new ZoomAPIError(`API scope test failed: ${scopeTestData.message || 'Unknown error'}`);
    }
    
    const scopeTestData = await scopeTestResponse.json();
    console.log('Scope test succeeded, user data:', scopeTestData.email);
    
    return {
      success: true,
      user: {
        email: scopeTestData.email,
        account_id: scopeTestData.account_id,
        user_id: scopeTestData.id
      }
    };
  } catch (error) {
    console.error('Error testing OAuth scopes:', error);
    
    // Error has already been converted to the appropriate type in withRetry
    if (error instanceof ZoomAPIError) {
      throw error;
    }
    
    // Convert other errors to appropriate types
    if (error.message?.includes('scopes')) {
      throw new ZoomScopesError(error.message);
    }
    
    if (!error.message || 
        error.message.includes('network') || 
        error.message.includes('timed out') ||
        error.message.includes('Failed to fetch')) {
      throw new ZoomNetworkError('Network error when testing API scopes. Please check your connection and try again.');
    }
    
    // Generic error
    throw new ZoomAPIError(`Failed to test API scopes: ${error.message || 'Unknown error'}`);
  }
}
