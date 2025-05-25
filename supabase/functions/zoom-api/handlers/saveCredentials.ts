import { createClient } from 'npm:@supabase/supabase-js@2';
import { getZoomAccessToken } from '../auth.ts';

/**
 * Saves and verifies Zoom API credentials for a user
 * 
 * @param supabase The Supabase client
 * @param userId The user ID to save credentials for
 * @param credentials The Zoom API credentials to save
 * @returns The verification result
 */
export async function saveCredentials(
  supabase: any,
  userId: string,
  credentials: {
    account_id: string;
    client_id: string;
    client_secret: string;
  }
) {
  // Validate required fields
  if (!credentials.account_id || !credentials.client_id || !credentials.client_secret) {
    throw new Error('Missing required credentials');
  }

  try {
    // Insert or update credentials in the database
    const { error: dbError } = await supabase
      .from('zoom_credentials')
      .upsert({
        user_id: userId,
        account_id: credentials.account_id,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Database error saving credentials:', dbError);
      throw new Error(`Error saving credentials: ${dbError.message}`);
    }

    // Verify credentials by attempting to get an access token
    try {
      const accessToken = await getZoomAccessToken(supabase, userId);
      
      // Make a test call to Zoom API to verify token and scopes
      const response = await fetch('https://api.zoom.us/v2/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check for scopes-related errors
        if (response.status === 400 && 
            (errorData.code === 4711 || 
             errorData.message?.toLowerCase().includes('scope'))) {
          return {
            success: false,
            code: 'missing_scopes',
            error: 'Missing required OAuth scopes',
            details: errorData
          };
        }
        
        throw new Error(errorData.message || `API error: ${response.status}`);
      }

      const userData = await response.json();
      
      // Update the last verified timestamp
      await supabase
        .from('zoom_credentials')
        .update({
          last_verified: new Date().toISOString(),
          is_valid: true,
          user_email: userData.email
        })
        .eq('user_id', userId);

      return {
        success: true,
        user_email: userData.email,
        user_id: userData.id
      };
    } catch (verifyError: any) {
      console.error('Error verifying credentials:', verifyError);

      // Update the database to mark credentials as invalid
      await supabase
        .from('zoom_credentials')
        .update({
          last_verified: new Date().toISOString(),
          is_valid: false,
          verification_error: verifyError.message
        })
        .eq('user_id', userId);

      throw verifyError;
    }
  } catch (error: any) {
    console.error('Error in saveCredentials:', error);
    throw error;
  }
}