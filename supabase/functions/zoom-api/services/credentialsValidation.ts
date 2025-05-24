
import { getZoomJwtToken } from '../auth.ts';
import { testApiScopes, updateCredentialsVerificationStatus } from './credentialsService.ts';

// Validate and save new credentials
export async function validateAndSaveCredentials(
  supabase: any,
  userId: string,
  credentialsData: {
    account_id: string;
    client_id: string;
    client_secret: string;
  }
): Promise<{ success: boolean; user_email?: string; error?: string }> {
  const { account_id, client_id, client_secret } = credentialsData;
  
  // Validate required fields
  if (!account_id || !client_id || !client_secret) {
    throw new Error('Missing required credentials: account_id, client_id, and client_secret are required');
  }
  
  try {
    // First try to get a token to verify credentials
    const testToken = await getZoomJwtToken(account_id, client_id, client_secret);
    
    // Now test scopes
    const scopeTestData = await testApiScopes({ 
      user_id: userId,
      account_id, 
      client_id, 
      client_secret,
      is_verified: false
    });
    
    // Credentials are valid, save or update
    const { data: credentialsData, error: upsertError } = await supabase
      .from('zoom_credentials')
      .upsert({
        user_id: userId,
        account_id,
        client_id,
        client_secret,
        is_verified: true,
        last_verified_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();
    
    if (upsertError) {
      throw new Error(`Failed to save credentials: ${upsertError.message}`);
    }
    
    return {
      success: true,
      user_email: scopeTestData.email
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Verify existing credentials
export async function verifyExistingCredentials(
  supabase: any,
  userId: string,
  credentials: any
): Promise<{ success: boolean; user?: any; error?: string; code?: string; details?: any }> {
  try {
    const scopeTestData = await testApiScopes(credentials);
    
    // Update credentials in database to mark as verified
    await updateCredentialsVerificationStatus(supabase, userId, true);
    
    return { 
      success: true, 
      user: {
        email: scopeTestData.email,
        account_id: scopeTestData.account_id
      }
    };
  } catch (error) {
    // Update credentials in database to mark as not verified
    await updateCredentialsVerificationStatus(supabase, userId, false);
    
    // Check if it's a scopes error
    if (error.message?.toLowerCase().includes('scopes') || 
        error.message?.toLowerCase().includes('scope')) {
      return {
        success: false,
        error: error.message,
        code: 'missing_scopes'
      };
    }
    
    return { 
      success: false, 
      error: error.message 
    };
  }
}
