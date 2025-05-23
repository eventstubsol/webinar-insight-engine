import { getZoomJwtToken } from '../auth/tokenService.ts';
import { updateCredentialsVerification } from './storage.ts';
import { corsHeaders, createErrorResponse, createSuccessResponse } from '../cors.ts';

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
    // Otherwise get a new token
    const token = await getZoomJwtToken(
      credentials.account_id,
      credentials.client_id,
      credentials.client_secret
    );
    
    // If we got here, the credentials are valid
    return token;
  } catch (error) {
    console.error('Zoom credential verification failed:', error);
    throw new Error(`Invalid Zoom credentials: ${error.message}`);
  }
}

// Test OAuth scopes to ensure all required ones are present
export async function testOAuthScopes(token: string) {
  console.log('Testing API scopes with a simple request...');
  
  try {
    const scopeTestResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!scopeTestResponse.ok) {
      const scopeTestData = await scopeTestResponse.json();
      console.error('Scope test failed:', scopeTestData);
      
      if (scopeTestData.code === 4711 || scopeTestData.message?.includes('scopes')) {
        throw new Error('Missing required OAuth scopes in your Zoom App. Please add these scopes to your Zoom Server-to-Server OAuth app: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin');
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
    throw error;
  }
}
