
import { corsHeaders } from './cors.ts';
import { getZoomJwtToken } from './auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

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
export async function handleCheckCredentialsStatus(req: Request, supabase: any, user: any) {
  const { data: credentials, error: credentialsError } = await supabase
    .from('zoom_credentials')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return new Response(JSON.stringify({
    hasCredentials: !!credentials,
    isVerified: credentials?.is_verified || false,
    lastVerified: credentials?.last_verified_at || null
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
    // Update credentials in database to mark as not verified
    await supabase
      .from('zoom_credentials')
      .update({ is_verified: false })
      .eq('user_id', user.id);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
