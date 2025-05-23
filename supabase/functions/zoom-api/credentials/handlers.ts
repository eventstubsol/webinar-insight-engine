
import { corsHeaders, createErrorResponse, createSuccessResponse } from '../cors.ts';
import { getZoomJwtToken } from '../auth/tokenService.ts';
import { getZoomCredentials, saveZoomCredentials, updateCredentialsVerification } from './storage.ts';
import { verifyZoomCredentials, testOAuthScopes } from './verification.ts';

// Handle saving zoom credentials
export async function handleSaveCredentials(req: Request, supabase: any, user: any, body: any) {
  const { account_id, client_id, client_secret } = body;
  
  // Validate required fields
  if (!account_id || !client_id || !client_secret) {
    throw new Error('Missing required credentials: account_id, client_id, and client_secret are required');
  }
  
  try {
    // First try to get a token to verify credentials
    const testToken = await getZoomJwtToken(account_id, client_id, client_secret);
    
    // Test scopes
    const scopeTest = await testOAuthScopes(testToken);
    
    // Credentials are valid, save or update
    await saveZoomCredentials(supabase, user.id, {
      account_id,
      client_id,
      client_secret
    }, true, testToken);
    
    return createSuccessResponse({
      success: true,
      message: 'Zoom credentials verified and saved successfully',
      user_email: scopeTest.user.email
    });
  } catch (error) {
    return createErrorResponse(error.message || 'Failed to save credentials');
  }
}

// Handle getting the user's saved credentials
export async function handleGetCredentials(req: Request, supabase: any, user: any) {
  try {
    console.log(`[zoom-api] Getting credentials for user ${user.id}`);
    
    // Get the credentials but exclude sensitive fields
    const { data: credentials, error } = await supabase
      .from('zoom_credentials')
      .select('account_id, client_id, client_secret')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching credentials:', error);
      return createErrorResponse('Failed to retrieve credentials', 400);
    }
    
    if (!credentials) {
      return createSuccessResponse({
        hasCredentials: false,
        message: 'No credentials found for this user'
      });
    }
    
    // Return the credentials
    return createSuccessResponse({
      hasCredentials: true,
      credentials: {
        account_id: credentials.account_id,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret
      }
    });
  } catch (error) {
    console.error('Exception fetching credentials:', error);
    return createErrorResponse(error.message || 'Failed to retrieve credentials');
  }
}

// Handle checking credentials status
export async function handleCheckCredentialsStatus(req: Request, supabase: any, user: any) {
  const { data: credentials, error: credentialsError } = await supabase
    .from('zoom_credentials')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return createSuccessResponse({
    hasCredentials: !!credentials,
    isVerified: credentials?.is_verified || false,
    lastVerified: credentials?.last_verified_at || null
  });
}

// Handle verifying credentials
export async function handleVerifyCredentials(req: Request, supabase: any, user: any, credentials: any) {
  try {
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Test scopes
    const scopeTest = await testOAuthScopes(token);
    
    // Update credentials in database to mark as verified and store the token
    await updateCredentialsVerification(supabase, user.id, true, token);
    
    return createSuccessResponse({ 
      success: true, 
      message: 'Zoom API credentials and scopes validated successfully',
      user: scopeTest.user
    });
  } catch (error) {
    // Update credentials in database to mark as not verified
    await updateCredentialsVerification(supabase, user.id, false);
    
    return createErrorResponse(error.message || 'Failed to verify credentials');
  }
}
