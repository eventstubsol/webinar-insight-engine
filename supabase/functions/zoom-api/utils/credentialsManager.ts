
/**
 * Zoom Credentials Manager
 * Handles fetching and validating Zoom API credentials for users
 */

interface ZoomCredentials {
  account_id: string;
  client_id: string;
  client_secret: string;
  access_token?: string;
  is_verified?: boolean;
}

/**
 * Get Zoom credentials for a user
 */
export async function getZoomCredentials(supabase: any, userId: string): Promise<ZoomCredentials> {
  console.log(`[credentialsManager] Fetching Zoom credentials for user: ${userId}`);
  
  try {
    // First try to get from zoom_credentials table
    const { data: credentials, error } = await supabase
      .from('zoom_credentials')
      .select('account_id, client_id, client_secret, access_token, is_verified')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[credentialsManager] Database error:', error);
      throw new Error(`Failed to fetch credentials: ${error.message}`);
    }
    
    if (credentials) {
      console.log('[credentialsManager] Found credentials in database');
      return {
        account_id: credentials.account_id,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        access_token: credentials.access_token,
        is_verified: credentials.is_verified
      };
    }
    
    // Fallback to environment variables (for development/testing)
    const envAccountId = Deno.env.get('ZOOM_ACCOUNT_ID');
    const envClientId = Deno.env.get('ZOOM_CLIENT_ID');
    const envClientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');
    
    if (envAccountId && envClientId && envClientSecret) {
      console.log('[credentialsManager] Using environment variables as fallback');
      return {
        account_id: envAccountId,
        client_id: envClientId,
        client_secret: envClientSecret,
        is_verified: true
      };
    }
    
    throw new Error('No Zoom credentials found for user');
    
  } catch (error) {
    console.error('[credentialsManager] Error fetching credentials:', error);
    throw error;
  }
}

/**
 * Validate that credentials are complete
 */
export function validateCredentials(credentials: ZoomCredentials): boolean {
  return !!(
    credentials.account_id &&
    credentials.client_id &&
    credentials.client_secret
  );
}

/**
 * Check if credentials are verified
 */
export function areCredentialsVerified(credentials: ZoomCredentials): boolean {
  return credentials.is_verified === true;
}
