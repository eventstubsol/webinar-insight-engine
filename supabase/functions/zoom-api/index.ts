
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'
import { getZoomCredentials } from './credentials.ts'
import { handleListWebinars } from './handlers/listWebinars.ts'
import { handleGetWebinar } from './handlers/getWebinar.ts'
import { handleGetWebinarInstances } from './handlers/getWebinarInstances.ts'
import { handleGetInstanceParticipants } from './handlers/getInstanceParticipants.ts'
import { handleGetParticipants } from './handlers/getParticipants.ts'
import { handleGetWebinarRecordings } from './handlers/getWebinarRecordings.ts'
import { handleSyncSingleWebinar } from './handlers/syncSingleWebinar.ts'
import { handleUpdateWebinarParticipants } from './handlers/updateWebinarParticipants.ts'
import { handleEnhanceSingleWebinar } from './handlers/enhanceSingleWebinar.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    const { action, ...params } = await req.json();
    console.log(`[zoom-api] Processing action: ${action} for user: ${user.id}`);

    // Get credentials for this user
    const credentials = await getZoomCredentials(supabase, user.id);
    if (!credentials) {
      throw new Error('Zoom credentials not found. Please configure your Zoom integration.');
    }

    // Route to appropriate handler
    switch (action) {
      case 'list-webinars':
        return await handleListWebinars(req, supabase, user, credentials, params.force_sync || false);
      
      case 'get-webinar':
        return await handleGetWebinar(req, supabase, user, credentials, params.id);
      
      case 'enhance-single-webinar':
        return await handleEnhanceSingleWebinar(req, supabase, user, credentials, params.webinar_id);
      
      case 'get-webinar-instances':
        return await handleGetWebinarInstances(req, supabase, user, credentials, params.webinar_id);
      
      case 'get-instance-participants':
        return await handleGetInstanceParticipants(req, supabase, user, credentials, params.webinar_id, params.instance_id);
      
      case 'get-participants':
        return await handleGetParticipants(req, supabase, user, credentials, params.webinar_id);
      
      case 'get-webinar-recordings':
        return await handleGetWebinarRecordings(req, supabase, user, credentials, params.webinar_id);
      
      case 'sync-single-webinar':
        return await handleSyncSingleWebinar(req, supabase, user, credentials, params.webinar_id);
      
      case 'update-webinar-participants':
        return await handleUpdateWebinarParticipants(req, supabase, user, credentials);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[zoom-api] Error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
