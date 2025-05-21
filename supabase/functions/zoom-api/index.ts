
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders, handleCors } from './cors.ts';
import { getZoomJwtToken } from './auth.ts';
import { 
  handleSaveCredentials, 
  handleVerifyCredentials, 
  handleCheckCredentialsStatus 
} from './credentials.ts';
import { 
  handleListWebinars, 
  handleGetWebinar, 
  handleGetParticipants,
  handleUpdateWebinarParticipants
} from './webinars.ts';
import { createErrorResponse } from './utils.ts';

// TokenCache for improved performance - keep in main file for shared access
export const tokenCache = new Map<string, { token: string, expires: number }>();

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
    const force_sync = body?.force_sync === true;
    
    console.log(`[zoom-api] Action: ${action}, force_sync: ${force_sync}`);
    
    // Get user's Zoom credentials from database if needed
    let credentials = null;
    
    // For actions that don't need credentials or are about setting up credentials
    if (action !== 'save-credentials' && action !== 'check-credentials-status') {
      const { data: credentialsData, error: credentialsError } = await supabase
        .from('zoom_credentials')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (credentialsError || !credentialsData) {
        return new Response(JSON.stringify({
          error: 'Zoom credentials not configured',
          code: 'credentials_missing',
          action: 'setup_required'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      credentials = credentialsData;
    }

    // Route to appropriate handler based on action
    switch (action) {
      case 'save-credentials':
        return await handleSaveCredentials(req, supabase, user, body);
      
      case 'check-credentials-status':
        return await handleCheckCredentialsStatus(req, supabase, user);
      
      case 'verify-credentials':
        return await handleVerifyCredentials(req, supabase, user, credentials);
      
      case 'list-webinars':
        return await handleListWebinars(req, supabase, user, credentials, force_sync);
      
      case 'get-webinar':
        return await handleGetWebinar(req, supabase, user, credentials, id);
      
      case 'get-participants':
        return await handleGetParticipants(req, supabase, user, credentials, id);
      
      case 'update-webinar-participants':
        return await handleUpdateWebinarParticipants(req, supabase, user, credentials);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('[zoom-api] Error:', error);
    return createErrorResponse(error);
  }
});
