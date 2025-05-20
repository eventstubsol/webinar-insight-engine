
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
async function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  return null
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = await handleCors(req)
  if (corsResponse) return corsResponse

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Get request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error('Invalid request body');
    }
    
    const action = body?.action;
    const id = body?.id;

    // First, check if credentials are configured
    const credentialsStatus = checkZoomCredentials();
    if (credentialsStatus.missing.length > 0) {
      console.error(`Missing Zoom credentials: ${credentialsStatus.missing.join(', ')}`);
      return new Response(JSON.stringify({
        error: `Zoom API credentials not properly configured. Missing: ${credentialsStatus.missing.join(', ')}`,
        code: 'credentials_missing',
        context: {
          hasAccountId: !!Deno.env.get('ZOOM_ACCOUNT_ID'),
          hasClientId: !!Deno.env.get('ZOOM_CLIENT_ID'),
          hasClientSecret: !!Deno.env.get('ZOOM_CLIENT_SECRET'),
          missing: credentialsStatus.missing
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Function to check if all required Zoom credentials are set
    function checkZoomCredentials() {
      const missing = [];
      const accountId = Deno.env.get('ZOOM_ACCOUNT_ID');
      const clientId = Deno.env.get('ZOOM_CLIENT_ID');
      const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');
      
      if (!accountId) missing.push('ZOOM_ACCOUNT_ID');
      if (!clientId) missing.push('ZOOM_CLIENT_ID');
      if (!clientSecret) missing.push('ZOOM_CLIENT_SECRET');
      
      return {
        isConfigured: missing.length === 0,
        missing
      };
    }

    // Generate a Server-to-Server OAuth access token
    async function getZoomJwtToken() {
      const accountId = Deno.env.get('ZOOM_ACCOUNT_ID');
      const clientId = Deno.env.get('ZOOM_CLIENT_ID');
      const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');

      // Validate Account ID format
      if (typeof accountId !== 'string' || accountId.trim() === '') {
        console.error(`Invalid Account ID format: ${accountId}`);
        throw new Error('Zoom Account ID is invalid or empty');
      }

      try {
        console.log(`Requesting Zoom token with account_credentials grant type for account ID starting with ${accountId.substring(0, 4)}...`);
        
        // Build the token URL with parameters
        const tokenUrl = new URL('https://zoom.us/oauth/token');
        tokenUrl.searchParams.append('grant_type', 'account_credentials');
        tokenUrl.searchParams.append('account_id', accountId);
        
        // Create authorization header with base64 encoded client_id:client_secret
        const authHeader = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
        
        const tokenResponse = await fetch(tokenUrl.toString(), {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });
        
        // Log response status for debugging
        console.log('Token response status:', tokenResponse.status, tokenResponse.statusText);
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
          console.error('Zoom token error response:', tokenData);
          
          // Provide more specific error messages based on error types
          if (tokenData.error === 'invalid_client') {
            throw new Error('Zoom API authentication failed: Invalid client credentials (Client ID or Client Secret)');
          } else if (tokenData.error === 'invalid_grant') {
            throw new Error('Zoom API authentication failed: Invalid Account ID or insufficient permissions');
          } else {
            throw new Error(`Failed to get Zoom token: ${tokenData.error || 'Unknown error'} - ${tokenData.error_description || ''}`);
          }
        }

        console.log('Successfully obtained Zoom access token');
        return tokenData.access_token;
      } catch (error) {
        console.error('Zoom JWT generation error:', error);
        throw error;
      }
    }

    // Check Zoom API configuration and connectivity
    if (action === 'verify-credentials') {
      try {
        const token = await getZoomJwtToken();
        
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
            return new Response(JSON.stringify({
              success: false,
              error: 'Missing required OAuth scopes in your Zoom App. Please add these scopes to your Zoom Server-to-Server OAuth app: user:read:admin, webinar:read:admin, webinar:write:admin',
              code: 'missing_scopes',
              details: scopeTestData
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          throw new Error(`API scope test failed: ${scopeTestData.message || 'Unknown error'}`);
        }
        
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
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Get webinars from Zoom
    if (action === 'list-webinars') {
      console.log('Starting list-webinars action');
      
      try {
        const token = await getZoomJwtToken();
        console.log('Fetching webinars with token');
        
        // First try to get the user's email
        const meResponse = await fetch('https://api.zoom.us/v2/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!meResponse.ok) {
          const meData = await meResponse.json();
          console.error('Failed to get user info:', meData);
          
          // Handle missing OAuth scopes error specifically
          if (meData.code === 4711 || meData.message?.includes('scopes')) {
            throw new Error('Missing required OAuth scopes in your Zoom App. Please add these scopes to your Zoom Server-to-Server OAuth app: user:read:admin, webinar:read:admin, webinar:write:admin');
          }
          
          // Handle other API error codes
          if (meData.code === 124) {
            throw new Error('Invalid Zoom access token. Please check your credentials.');
          } else if (meData.code === 1001) {
            throw new Error('User not found or does not exist in this account.');
          } else {
            throw new Error(`Failed to get user info: ${meData.message || 'Unknown error'}`);
          }
        }
        
        const meData = await meResponse.json();
        console.log(`Got user info for: ${meData.email}`);

        // Now fetch the webinars
        const response = await fetch(`https://api.zoom.us/v2/users/${meData.id}/webinars?page_size=300`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          console.error('Zoom webinars error:', responseData);
          
          if (responseData.code === 4700) {
            throw new Error('Webinar capabilities not enabled for this Zoom account. This feature requires a Zoom paid plan with webinar add-on.');
          } else if (responseData.code === 4711 || responseData.message?.includes('scopes')) {
            throw new Error('Missing required OAuth webinar scopes. Please add webinar:read:admin to your Zoom app.');
          } else {
            throw new Error(`Failed to fetch webinars: ${responseData.message || 'Unknown error'} (Code: ${responseData.code || 'Unknown'})`);
          }
        }
        
        console.log(`Successfully fetched ${responseData.webinars?.length || 0} webinars`);
        
        return new Response(JSON.stringify({ webinars: responseData.webinars || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error in list-webinars action:', error);
        throw error; // Let the main error handler format the response
      }
    }
    
    // Get webinar details
    else if (action === 'get-webinar' && id) {
      const token = await getZoomJwtToken();
      
      const response = await fetch(`https://api.zoom.us/v2/webinars/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Zoom webinar details error:', data);
        throw new Error(`Failed to fetch webinar details: ${data.message || 'Unknown error'}`);
      }

      return new Response(JSON.stringify({ webinar: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get webinar participants (registrants and attendees)
    else if (action === 'get-participants' && id) {
      const token = await getZoomJwtToken();
      
      const [registrantsRes, attendeesRes] = await Promise.all([
        fetch(`https://api.zoom.us/v2/webinars/${id}/registrants?page_size=300`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`https://api.zoom.us/v2/past_webinars/${id}/participants?page_size=300`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);
      
      const [registrantsData, attendeesData] = await Promise.all([
        registrantsRes.json(),
        attendeesRes.json()
      ]);
      
      return new Response(JSON.stringify({
        registrants: registrantsRes.ok ? registrantsData.registrants || [] : [],
        attendees: attendeesRes.ok ? attendeesData.participants || [] : []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Zoom API error:', error);
    
    // Enhanced error response with more details and user-friendly messages
    let errorMessage = error.message || 'Unknown error';
    let errorCode = 500;
    let errorType = 'unknown_error';
    
    // Format error message for common issues
    if (errorMessage.includes('Account ID') || errorMessage.includes('account_id')) {
      errorMessage = 'Zoom Account ID is missing, invalid, or not correctly set in Supabase Secrets.';
      errorType = 'account_id_error';
    } else if (errorMessage.includes('client credentials') || errorMessage.includes('invalid_client')) {
      errorMessage = 'Invalid Zoom Client ID or Client Secret. Please check your credentials in Supabase Secrets.';
      errorType = 'credentials_error';
    } else if (errorMessage.includes('capabilities')) {
      errorMessage = 'Your Zoom account does not have webinar capabilities enabled. This requires a Zoom paid plan with webinars.';
      errorCode = 403;
      errorType = 'capabilities_error';
    } else if (errorMessage.includes('scopes')) {
      errorMessage = 'Missing required OAuth scopes in your Zoom App. Please update your Zoom Server-to-Server OAuth app to include: user:read:admin, webinar:read:admin, webinar:write:admin';
      errorCode = 403;
      errorType = 'scopes_error';
    }
    
    const errorResponse = {
      error: errorMessage,
      code: errorType,
      context: {
        hasAccountId: !!Deno.env.get('ZOOM_ACCOUNT_ID'),
        hasClientId: !!Deno.env.get('ZOOM_CLIENT_ID'),
        hasClientSecret: !!Deno.env.get('ZOOM_CLIENT_SECRET')
      }
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: errorCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
