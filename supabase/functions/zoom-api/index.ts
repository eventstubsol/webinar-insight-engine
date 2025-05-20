
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

// TokenCache for improved performance
const tokenCache = new Map<string, { token: string, expires: number }>();

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = await handleCors(req)
  if (corsResponse) return corsResponse

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Get user from the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized: Invalid user token');
    }

    // Get request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error('Invalid request body');
    }
    
    const action = body?.action;
    const id = body?.id;
    
    // Get user's Zoom credentials from database
    const { data: credentials, error: credentialsError } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    // Handle cases when credentials are needed but not found
    if (credentialsError || !credentials) {
      if (action === 'save-credentials') {
        // Allow this action to proceed without credentials
      } else if (action === 'check-credentials-status') {
        return new Response(JSON.stringify({
          hasCredentials: false,
          message: 'Zoom credentials not found for this user'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({
          error: 'Zoom credentials not configured',
          code: 'credentials_missing',
          action: 'setup_required'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Save user credentials to database
    if (action === 'save-credentials') {
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

    // Check credentials status
    if (action === 'check-credentials-status') {
      return new Response(JSON.stringify({
        hasCredentials: !!credentials,
        isVerified: credentials?.is_verified || false,
        lastVerified: credentials?.last_verified_at || null
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate a Server-to-Server OAuth access token
    async function getZoomJwtToken(accountId: string, clientId: string, clientSecret: string) {
      // For a specific user, create a cache key
      const cacheKey = `${accountId}:${clientId}`; 
      
      // Check cache first
      const cachedToken = tokenCache.get(cacheKey);
      if (cachedToken && cachedToken.expires > Date.now()) {
        console.log('Using cached Zoom token');
        return cachedToken.token;
      }

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

        // Cache the token (expires in seconds from now)
        const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour if not specified
        tokenCache.set(cacheKey, {
          token: tokenData.access_token,
          expires: Date.now() + (expiresIn * 1000) - 60000 // Expire 1 minute early to be safe
        });

        console.log('Successfully obtained Zoom access token');
        return tokenData.access_token;
      } catch (error) {
        console.error('Zoom JWT generation error:', error);
        throw error;
      }
    }

    // Verify credentials
    if (action === 'verify-credentials') {
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

    // Get webinars from Zoom
    if (action === 'list-webinars') {
      console.log('Starting list-webinars action for user:', user.id);
      
      try {
        const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
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
            throw new Error('Missing required OAuth scopes in your Zoom App. Please add these scopes to your Zoom Server-to-Server OAuth app: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin');
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
            throw new Error('Missing required OAuth webinar scopes. Please add webinar:read:webinar:admin to your Zoom app.');
          } else {
            throw new Error(`Failed to fetch webinars: ${responseData.message || 'Unknown error'} (Code: ${responseData.code || 'Unknown'})`);
          }
        }
        
        console.log(`Successfully fetched ${responseData.webinars?.length || 0} webinars`);
        
        // Store webinars in database for this user
        if (responseData.webinars && responseData.webinars.length > 0) {
          // First delete existing webinars for this user
          const { error: deleteError } = await supabase
            .from('zoom_webinars')
            .delete()
            .eq('user_id', user.id);
          
          if (deleteError) {
            console.error('Error deleting existing webinars:', deleteError);
          }
          
          // Insert new webinars
          const webinarsToInsert = responseData.webinars.map((webinar: any) => ({
            user_id: user.id,
            webinar_id: webinar.id,
            webinar_uuid: webinar.uuid,
            topic: webinar.topic,
            start_time: webinar.start_time,
            duration: webinar.duration,
            timezone: webinar.timezone,
            agenda: webinar.agenda || '',
            host_email: webinar.host_email,
            status: webinar.status,
            type: webinar.type,
            raw_data: webinar
          }));
          
          const { error: insertError } = await supabase
            .from('zoom_webinars')
            .insert(webinarsToInsert);
          
          if (insertError) {
            console.error('Error inserting webinars:', insertError);
          }
          
          // Record sync in history
          await supabase
            .from('zoom_sync_history')
            .insert({
              user_id: user.id,
              sync_type: 'webinars',
              status: 'success',
              items_synced: webinarsToInsert.length,
              message: `Successfully synced ${webinarsToInsert.length} webinars`
            });
        } else {
          // Record empty sync in history
          await supabase
            .from('zoom_sync_history')
            .insert({
              user_id: user.id,
              sync_type: 'webinars',
              status: 'success',
              items_synced: 0,
              message: 'No webinars found to sync'
            });
        }
        
        return new Response(JSON.stringify({ webinars: responseData.webinars || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error in list-webinars action:', error);
        
        // Record failed sync in history
        await supabase
          .from('zoom_sync_history')
          .insert({
            user_id: user.id,
            sync_type: 'webinars',
            status: 'error',
            items_synced: 0,
            message: error.message || 'Unknown error'
          });
        
        throw error; // Let the main error handler format the response
      }
    }
    
    // Get webinar details
    else if (action === 'get-webinar' && id) {
      const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
      
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
      const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
      
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
      
      // Store participants in database
      if (registrantsRes.ok && registrantsData.registrants && registrantsData.registrants.length > 0) {
        // Delete existing registrants for this webinar
        await supabase
          .from('zoom_webinar_participants')
          .delete()
          .eq('user_id', user.id)
          .eq('webinar_id', id)
          .eq('participant_type', 'registrant');
        
        // Insert new registrants
        const registrantsToInsert = registrantsData.registrants.map((registrant: any) => ({
          user_id: user.id,
          webinar_id: id,
          participant_type: 'registrant',
          participant_id: registrant.id,
          email: registrant.email,
          name: `${registrant.first_name} ${registrant.last_name}`.trim(),
          join_time: registrant.create_time,
          raw_data: registrant
        }));
        
        await supabase
          .from('zoom_webinar_participants')
          .insert(registrantsToInsert);
      }
      
      if (attendeesRes.ok && attendeesData.participants && attendeesData.participants.length > 0) {
        // Delete existing attendees for this webinar
        await supabase
          .from('zoom_webinar_participants')
          .delete()
          .eq('user_id', user.id)
          .eq('webinar_id', id)
          .eq('participant_type', 'attendee');
        
        // Insert new attendees
        const attendeesToInsert = attendeesData.participants.map((attendee: any) => ({
          user_id: user.id,
          webinar_id: id,
          participant_type: 'attendee',
          participant_id: attendee.id,
          email: attendee.user_email,
          name: attendee.name,
          join_time: attendee.join_time,
          leave_time: attendee.leave_time,
          duration: attendee.duration,
          raw_data: attendee
        }));
        
        await supabase
          .from('zoom_webinar_participants')
          .insert(attendeesToInsert);
      }
      
      // Record sync in history
      await supabase
        .from('zoom_sync_history')
        .insert({
          user_id: user.id,
          sync_type: 'participants',
          status: 'success',
          items_synced: (registrantsData.registrants?.length || 0) + (attendeesData.participants?.length || 0),
          message: `Synced ${registrantsData.registrants?.length || 0} registrants and ${attendeesData.participants?.length || 0} attendees`
        });
      
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
      errorMessage = 'Zoom Account ID is missing, invalid, or not correctly set.';
      errorType = 'account_id_error';
    } else if (errorMessage.includes('client credentials') || errorMessage.includes('invalid_client')) {
      errorMessage = 'Invalid Zoom Client ID or Client Secret. Please check your credentials.';
      errorType = 'credentials_error';
    } else if (errorMessage.includes('capabilities')) {
      errorMessage = 'Your Zoom account does not have webinar capabilities enabled. This requires a Zoom paid plan with webinars.';
      errorCode = 403;
      errorType = 'capabilities_error';
    } else if (errorMessage.includes('scopes')) {
      errorMessage = 'Missing required OAuth scopes in your Zoom App. Please update your Zoom Server-to-Server OAuth app to include: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin';
      errorCode = 403;
      errorType = 'scopes_error';
    } else if (errorMessage.includes('Unauthorized')) {
      errorMessage = 'You are not authorized to access this resource. Please log in again.';
      errorCode = 401;
      errorType = 'auth_error';
    }
    
    const errorResponse = {
      error: errorMessage,
      code: errorType
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: errorCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
