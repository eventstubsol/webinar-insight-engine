import { corsHeaders, createErrorResponse, createSuccessResponse } from '../cors.ts';

// Get Zoom credentials for a user
export async function getZoomCredentials(supabase: any, userId: string) {
  console.log(`Getting Zoom credentials for user ${userId}`);
  
  try {
    const { data, error } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching credentials:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    // Check if the token is expired or will expire soon
    if (data.access_token && data.token_expires_at) {
      // Convert the expires_at timestamp to a Date
      const expiresAt = new Date(data.token_expires_at).getTime();
      
      // If token expires in less than 5 minutes, it will be refreshed on use
      const expiresInMs = expiresAt - Date.now();
      const expiresInMinutes = Math.floor(expiresInMs / (1000 * 60));
      
      if (expiresInMs <= 0) {
        console.log('Token is expired, will be refreshed on use');
      } else if (expiresInMinutes < 5) {
        console.log(`Token expires soon (in ${expiresInMinutes} minutes), will be refreshed on use`);
      } else {
        console.log(`Token valid for ${expiresInMinutes} more minutes`);
      }
    }
    
    return data;
  } catch (e) {
    console.error('Error in getZoomCredentials:', e);
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
  token?: string,
  verified: boolean = false
) {
  try {
    console.log(`Saving credentials for user ${userId}, with token: ${token ? 'present' : 'not present'}`);
    
    // Calculate token expiration time if token is provided
    let tokenExpiresAt = null;
    if (token && credentials.expires_in) {
      tokenExpiresAt = new Date(Date.now() + (credentials.expires_in * 1000)).toISOString();
      console.log(`Token will expire at ${tokenExpiresAt}`);
    }
    
    // Check if credentials already exist for this user
    const { data: existingData } = await supabase
      .from('zoom_credentials')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    const upsertData = {
      user_id: userId,
      account_id: credentials.account_id,
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      is_verified: verified,
      updated_at: new Date().toISOString(),
      access_token: token || null,
      token_expires_at: tokenExpiresAt
    };
    
    // Update or insert credentials
    const { data, error } = await supabase
      .from('zoom_credentials')
      .upsert(upsertData, { onConflict: 'user_id' })
      .select('id, is_verified')
      .single();
    
    if (error) {
      console.error('Error saving credentials:', error);
      throw new Error(`Failed to save credentials: ${error.message}`);
    }
    
    console.log(`Successfully ${existingData ? 'updated' : 'saved'} credentials for user ${userId}`);
    return data;
  } catch (e) {
    console.error('Error in saveZoomCredentials:', e);
    throw e;
  }
}

// Update credentials verification status
export async function updateCredentialsVerification(
  supabase: any, 
  userId: string, 
  verified: boolean,
  token?: string,
  tokenExpiresIn?: number
) {
  try {
    // Calculate token expiration time if token is provided
    let tokenExpiresAt = null;
    if (token && tokenExpiresIn) {
      tokenExpiresAt = new Date(Date.now() + (tokenExpiresIn * 1000)).toISOString();
    }
    
    const updateData: any = { 
      is_verified: verified,
      updated_at: new Date().toISOString()
    };
    
    // Add token fields if provided
    if (token) {
      updateData.access_token = token;
      updateData.token_expires_at = tokenExpiresAt;
    }
    
    const { data, error } = await supabase
      .from('zoom_credentials')
      .update(updateData)
      .eq('user_id', userId)
      .select('id, is_verified')
      .single();
    
    if (error) {
      console.error('Error updating verification status:', error);
      throw new Error(`Failed to update verification status: ${error.message}`);
    }
    
    console.log(`Successfully updated verification status to ${verified} for user ${userId}`);
    if (token) {
      console.log(`Updated token with expiry in ${tokenExpiresIn || 'unknown'} seconds`);
    }
    
    return data;
  } catch (e) {
    console.error('Error in updateCredentialsVerification:', e);
    throw e;
  }
}
