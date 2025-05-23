import { corsHeaders, createErrorResponse, createSuccessResponse } from '../cors.ts';

// Get Zoom credentials for a user
export async function getZoomCredentials(supabase: any, userId: string) {
  console.log(`Getting Zoom credentials for user ${userId}`);
  
  try {
    const { data: credentials, error } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching Zoom credentials:', error);
      return null;
    }
    
    if (!credentials) {
      console.log('No Zoom credentials found for this user');
      return null;
    }
    
    // Check token expiry if we have a token and expiry time
    if (credentials.access_token && credentials.token_expires_at) {
      const expiryTime = new Date(credentials.token_expires_at).getTime();
      const now = new Date().getTime();
      
      // If token is expired or close to expiry (within 5 minutes), mark it as invalid
      if (expiryTime - now < 5 * 60 * 1000) {
        console.log('Access token is expired or about to expire');
        // We keep the token in the response but mark it as needing refresh
        credentials.token_needs_refresh = true;
      }
    }
    
    return credentials;
  } catch (err) {
    console.error('Exception when fetching Zoom credentials:', err);
    return null;
  }
}

// Save or update Zoom credentials
export async function saveZoomCredentials(
  supabase: any, 
  userId: string, 
  credentials: { 
    account_id: string, 
    client_id: string, 
    client_secret: string 
  },
  isVerified: boolean = false,
  accessToken?: string,
  expiresIn?: number
) {
  try {
    console.log(`Saving credentials for user ${userId}, with token: ${accessToken ? 'present' : 'not present'}`);
    
    // Calculate token expiry time if provided
    let tokenExpiresAt = null;
    if (accessToken && expiresIn) {
      tokenExpiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
      console.log(`Token will expire at ${tokenExpiresAt}`);
    }
    
    const { data, error } = await supabase
      .from('zoom_credentials')
      .upsert({
        user_id: userId,
        account_id: credentials.account_id,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        is_verified: isVerified,
        access_token: accessToken,
        token_expires_in: expiresIn,
        token_expires_at: tokenExpiresAt,
        last_verified_at: isVerified ? new Date().toISOString() : null
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving credentials:', error);
      throw new Error(`Failed to save credentials: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error saving Zoom credentials:', error);
    throw error;
  }
}

// Update credentials verification status
export async function updateCredentialsVerification(
  supabase: any, 
  userId: string, 
  isVerified: boolean,
  accessToken?: string,
  expiresIn?: number
) {
  try {
    const updateData: any = { 
      is_verified: isVerified
    };
    
    if (isVerified) {
      updateData.last_verified_at = new Date().toISOString();
    }
    
    // Handle token and expiry information
    if (accessToken) {
      console.log(`Updating credentials with new access token for user ${userId}`);
      updateData.access_token = accessToken;
      
      // If we have expiry information, store it
      if (expiresIn) {
        updateData.token_expires_in = expiresIn;
        updateData.token_expires_at = new Date(Date.now() + (expiresIn * 1000)).toISOString();
        console.log(`Token will expire at ${updateData.token_expires_at}`);
      }
    }
    
    const { error } = await supabase
      .from('zoom_credentials')
      .update(updateData)
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error updating credentials verification:', error);
      throw error;
    }
    
    console.log(`Successfully updated verification status to ${isVerified} for user ${userId}`);
  } catch (error) {
    console.error('Error updating credentials verification:', error);
    throw error;
  }
}
