
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
  accessToken?: string
) {
  try {
    console.log(`Saving credentials for user ${userId}, with token: ${accessToken ? 'present' : 'not present'}`);
    
    const { data, error } = await supabase
      .from('zoom_credentials')
      .upsert({
        user_id: userId,
        account_id: credentials.account_id,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        is_verified: isVerified,
        access_token: accessToken,
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
  accessToken?: string
) {
  try {
    const updateData: any = { 
      is_verified: isVerified
    };
    
    if (isVerified) {
      updateData.last_verified_at = new Date().toISOString();
    }
    
    if (accessToken) {
      console.log(`Updating credentials with new access token for user ${userId}`);
      updateData.access_token = accessToken;
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
