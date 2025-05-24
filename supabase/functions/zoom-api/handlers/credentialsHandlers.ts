
import { corsHeaders } from '../cors.ts';
import { validateAndSaveCredentials, verifyExistingCredentials } from '../services/credentialsValidation.ts';

// Handle saving zoom credentials
export async function handleSaveCredentials(req: Request, supabase: any, user: any, body: any) {
  const { account_id, client_id, client_secret } = body;
  
  const result = await validateAndSaveCredentials(supabase, user.id, {
    account_id,
    client_id,
    client_secret
  });
  
  if (result.success) {
    return new Response(JSON.stringify({
      success: true,
      message: 'Zoom credentials verified and saved successfully',
      user_email: result.user_email
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } else {
    return new Response(JSON.stringify({
      success: false,
      error: result.error
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
  const result = await verifyExistingCredentials(supabase, user.id, credentials);
  
  if (result.success) {
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Zoom API credentials and scopes validated successfully',
      user: result.user
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } else {
    const status = result.code === 'missing_scopes' ? 400 : 400;
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: result.error,
      code: result.code,
      details: result.details
    }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
