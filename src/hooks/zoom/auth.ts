import { supabase } from '@/integrations/supabase/client';
import { tokenCache } from './cacheUtils';

// Get Zoom access token with fallback for development
export async function getZoomAccessToken(supabaseClient: any, userId: string): Promise<string> {
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    console.log('[getZoomAccessToken] Using mock token in development mode');
    return 'mock-zoom-token-for-development';
  }
  
  try {
    // Get credentials from database
    const { data: credentials, error } = await supabaseClient
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !credentials) {
      throw new Error('Zoom credentials not configured');
    }
    
    // Get token using credentials
    const token = await getZoomJwtToken(
      credentials.account_id,
      credentials.client_id,
      credentials.client_secret
    );
    
    return token;
  } catch (err) {
    console.error('Error getting Zoom access token:', err);
    throw err;
  }
}

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