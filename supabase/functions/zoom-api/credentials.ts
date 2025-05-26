
import { corsHeaders } from './cors.ts';
import { getZoomJwtToken } from './auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Handle saving zoom credentials
export async function handleSaveCredentials(req: Request) {
  try {
    const body = await req.json();
    const { account_id, client_id, client_secret } = body;
    
    // Validate required fields
    if (!account_id || !client_id || !client_secret) {
      throw new Error('Missing required credentials: account_id, client_id, and client_secret are required');
    }
    
    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }
    
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
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Zoom credentials verified and saved successfully',
      user_email: scopeTestData.email
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[handleSaveCredentials] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle checking credentials status
export async function handleCheckCredentialsStatus(req: Request) {
  try {
    console.log('[handleCheckCredentialsStatus] Starting credentials check');
    
    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[handleCheckCredentialsStatus] No authorization header found');
      return new Response(JSON.stringify({
        hasCredentials: false,
        isVerified: false,
        lastVerified: null
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      console.error('[handleCheckCredentialsStatus] Authentication failed:', authError);
      return new Response(JSON.stringify({
        hasCredentials: false,
        isVerified: false,
        lastVerified: null
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`[handleCheckCredentialsStatus] Checking credentials for user: ${user.id}`);
    
    const { data: credentials, error: credentialsError } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (credentialsError) {
      console.error('[handleCheckCredentialsStatus] Database error:', credentialsError);
      throw new Error(`Database error: ${credentialsError.message}`);
    }

    console.log(`[handleCheckCredentialsStatus] Found credentials: ${!!credentials}`);

    return new Response(JSON.stringify({
      hasCredentials: !!credentials,
      isVerified: credentials?.is_verified || false,
      lastVerified: credentials?.last_verified_at || null
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[handleCheckCredentialsStatus] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle verifying credentials
export async function handleVerifyCredentials(req: Request) {
  try {
    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }
    
    // Get user's credentials
    const { data: credentials, error: credentialsError } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (credentialsError || !credentials) {
      throw new Error('No credentials found for this user');
    }
    
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
        
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required OAuth scopes in your Zoom App. Please add these scopes to your Zoom Server-to-Server OAuth app: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin',
          code: 'missing_scopes',
          details: scopeTestData
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`API scope test failed: ${scopeTestData.message || 'Unknown error'}`);
    }
    
    // Update credentials in database to mark as verified
    await supabase
      .from('zoom_credentials')
      .update({ 
        is_verified: true,
        last_verified_at: new Date().toISOString()
      })
      .eq('user_id', user.id);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Zoom API credentials and scopes validated successfully',
      user: {
        email: scopeTestData.email,
        account_id: scopeTestData.account_id
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[handleVerifyCredentials] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Get Zoom credentials for a user - for internal use
export async function getZoomCredentials(userId: string) {
  console.log(`Getting Zoom credentials for user ${userId}`);
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
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

// Verify that Zoom credentials are valid - for internal use
export async function verifyZoomCredentials(credentials: any) {
  if (!credentials) {
    throw new Error('Credentials are required');
  }
  
  try {
    console.log('Verifying Zoom credentials...');
    // Try to get a token to verify the credentials work
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
