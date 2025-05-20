
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

    // Generate a Server-to-Server OAuth access token
    async function getZoomJwtToken() {
      const accountId = Deno.env.get('ZOOM_ACCOUNT_ID');
      const clientId = Deno.env.get('ZOOM_CLIENT_ID');
      const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');

      // Validate required credentials
      if (!accountId || !clientId || !clientSecret) {
        const missingCreds = [];
        if (!accountId) missingCreds.push('ZOOM_ACCOUNT_ID');
        if (!clientId) missingCreds.push('ZOOM_CLIENT_ID'); 
        if (!clientSecret) missingCreds.push('ZOOM_CLIENT_SECRET');
        
        console.error(`Missing Zoom credentials: ${missingCreds.join(', ')}`);
        throw new Error(`Zoom API credentials not properly configured. Missing: ${missingCreds.join(', ')}`);
      }

      // Validate Account ID format (should look like a string, not undefined)
      if (typeof accountId !== 'string' || accountId.trim() === '') {
        console.error(`Invalid Account ID format: ${accountId}`);
        throw new Error('Zoom Account ID is invalid or empty');
      }

      try {
        console.log(`Requesting Zoom token with account_credentials grant type for account ${accountId.substring(0, 5)}...`);
        
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
          
          // Handle specific API error codes
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
            throw new Error('Webinar capabilities not enabled for this Zoom account');
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
    
    // Format error message for common issues
    if (errorMessage.includes('Account ID')) {
      errorMessage = 'Zoom Account ID is missing or invalid. Please verify it is correctly set in Supabase Secrets.';
    } else if (errorMessage.includes('client credentials')) {
      errorMessage = 'Invalid Zoom Client ID or Client Secret. Please check your credentials in Supabase Secrets.';
    } else if (errorMessage.includes('capabilities')) {
      errorMessage = 'Your Zoom account does not have webinar capabilities enabled. This requires a Zoom paid plan with webinars.';
      errorCode = 403;
    }
    
    const errorResponse = {
      error: errorMessage,
      code: error.code || 'unknown_error',
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
