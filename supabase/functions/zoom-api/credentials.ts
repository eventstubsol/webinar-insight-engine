
import { corsHeaders, createErrorResponse, createSuccessResponse } from './cors.ts';
import { getZoomJwtToken } from './auth.ts';

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
    
    // Now test scopes
    const scopeTestResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const scopeTestData = await scopeTestResponse.json();
    
    if (!scopeTestResponse.ok) {
      if (scopeTestData.code === 4711 || scopeTestData.message?.includes('scopes')) {
        throw new Error('Missing required OAuth scopes in your Zoom App.');
      }
      throw new Error(`API scope test failed: ${scopeTestData.message || 'Unknown error'}`);
    }
    
    // Credentials are valid, save or update
    const { data: credentialsData, error: upsertError } = await supabase
      .from('zoom_credentials')
      .upsert({
        user_id: user.id,
        account_id,
        client_id,
        client_secret,
        access_token: testToken,
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
    
    return createSuccessResponse({
      success: true,
      message: 'Zoom credentials verified and saved successfully',
      user_email: scopeTestData.email
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
    
    // Now test if we have the proper scopes by making a simple request
    console.log('Testing API scopes with a simple request...');
    const scopeTestResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const scopeTestData = await scopeTestResponse.json();
    
    if (!scopeTestResponse.ok) {
      console.error('Scope test failed:', scopeTestData);
      
      if (scopeTestData.code === 4711 || 
          scopeTestData.message?.includes('scopes')) {
        
        // Update credentials in database to mark as not verified
        await supabase
          .from('zoom_credentials')
          .update({ is_verified: false })
          .eq('user_id', user.id);
        
        return createErrorResponse('Missing required OAuth scopes in your Zoom App. Please add these scopes to your Zoom Server-to-Server OAuth app: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin', 400);
      }
      
      throw new Error(`API scope test failed: ${scopeTestData.message || 'Unknown error'}`);
    }
    
    // Update credentials in database to mark as verified and store the token
    await supabase
      .from('zoom_credentials')
      .update({ 
        is_verified: true,
        access_token: token,
        last_verified_at: new Date().toISOString()
      })
      .eq('user_id', user.id);
    
    return createSuccessResponse({ 
      success: true, 
      message: 'Zoom API credentials and scopes validated successfully',
      user: {
        email: scopeTestData.email,
        account_id: scopeTestData.account_id
      }
    });
  } catch (error) {
    // Update credentials in database to mark as not verified
    await supabase
      .from('zoom_credentials')
      .update({ is_verified: false })
      .eq('user_id', user.id);
    
    return createErrorResponse(error.message || 'Failed to verify credentials');
  }
}

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

// Verify that Zoom credentials are valid
export async function verifyZoomCredentials(credentials: any) {
  if (!credentials) {
    throw new Error('Credentials are required');
  }
  
  try {
    console.log('Verifying Zoom credentials...');
    
    // If we already have a valid token, use it
    if (credentials.access_token) {
      return credentials.access_token;
    }
    
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
