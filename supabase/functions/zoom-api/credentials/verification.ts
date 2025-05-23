import { getZoomJwtToken } from '../auth/tokenService.ts';
import { updateCredentialsVerification } from './storage.ts';
import { corsHeaders, createErrorResponse, createSuccessResponse } from '../cors.ts';

// Maximum number of retries for API calls
const MAX_RETRIES = 2;
// Base delay between retries (in milliseconds)
const BASE_RETRY_DELAY = 500;

// Helper function to add exponential backoff to API calls
async function withRetry<T>(operation: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      
      // Check if we should retry based on the error
      if (err.status === 429 || err.status >= 500 || 
          err.message?.includes('network') || 
          err.message?.includes('timed out')) {
        
        // Calculate delay with exponential backoff
        const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);
        console.log(`API call failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For other errors, don't retry
      throw err;
    }
  }
  
  // If we've exhausted all retries
  throw lastError;
}

// Verify that Zoom credentials are valid
export async function verifyZoomCredentials(credentials: any) {
  if (!credentials) {
    throw new Error('Credentials are required');
  }
  
  try {
    console.log('Verifying Zoom credentials...');
    
    // If we already have a valid token, use it
    if (credentials.access_token) {
      console.log('Using existing access token');
      return credentials.access_token;
    }
    
    console.log('No existing token found, requesting new token...');
    // Otherwise get a new token with retry logic
    const token = await withRetry(() => getZoomJwtToken(
      credentials.account_id,
      credentials.client_id,
      credentials.client_secret
    ));
    
    // If we got here, the credentials are valid
    return token;
  } catch (error) {
    console.error('Zoom credential verification failed:', error);
    
    // Enhance error message based on the type of error
    if (error.message?.includes('Invalid client_id or client_secret')) {
      throw new Error('Invalid client ID or client secret. Please check your credentials.');
    } else if (error.message?.includes('Invalid account_id')) {
      throw new Error('Invalid account ID. Please check your Zoom account ID.');
    } else if (error.message?.includes('429')) {
      throw new Error('Rate limit exceeded. Please try again in a few minutes.');
    } else if (error.message?.includes('timed out') || 
              error.message?.includes('network') || 
              error.message?.includes('Failed to fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    // Generic error
    throw new Error(`Invalid Zoom credentials: ${error.message || 'Unknown error'}`);
  }
}

// Test OAuth scopes to ensure all required ones are present
export async function testOAuthScopes(token: string) {
  console.log('Testing API scopes with a simple request...');
  
  try {
    // Use retry logic for API call
    const scopeTestResponse = await withRetry(() => fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }));
    
    if (!scopeTestResponse.ok) {
      const scopeTestData = await scopeTestResponse.json();
      console.error('Scope test failed:', scopeTestData);
      
      // Enhanced error message for missing scopes
      if (scopeTestData.code === 4711 || scopeTestData.message?.includes('scopes')) {
        throw new Error(
          'Your Zoom Server-to-Server OAuth app is missing required scopes. ' +
          'Please add these scopes to your Zoom app: ' +
          'user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin'
        );
      }
      
      // Handle other API errors
      if (scopeTestData.code === 429) {
        throw new Error('Zoom API rate limit exceeded. Please try again later.');
      } else if (scopeTestData.code >= 500) {
        throw new Error('Zoom API server error. Please try again later.');
      }
      
      throw new Error(`API scope test failed: ${scopeTestData.message || 'Unknown error'}`);
    }
    
    const scopeTestData = await scopeTestResponse.json();
    console.log('Scope test succeeded, user data:', scopeTestData.email);
    
    return {
      success: true,
      user: {
        email: scopeTestData.email,
        account_id: scopeTestData.account_id
      }
    };
  } catch (error) {
    console.error('Error testing OAuth scopes:', error);
    
    // Check for specific error conditions
    if (error.message?.includes('scopes')) {
      // Pass through the scopes error
      throw error;
    }
    
    // Network error
    if (!error.message || 
        error.message.includes('network') || 
        error.message.includes('timed out') ||
        error.message.includes('Failed to fetch')) {
      throw new Error('Network error when testing API scopes. Please check your connection and try again.');
    }
    
    // Generic error
    throw new Error(`Failed to test API scopes: ${error.message || 'Unknown error'}`);
  }
}
