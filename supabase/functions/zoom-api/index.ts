import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';
import { getZoomCredentials } from './auth.ts';
import { handleListWebinars } from './handlers/listWebinars.ts';
import { handleGetWebinar } from './handlers/getWebinar.ts';
import { handleGetParticipants } from './handlers/getParticipants.ts';
import { handleUpdateWebinarParticipants } from './handlers/updateWebinarParticipants.ts';
import { handleGetWebinarInstances } from './handlers/getWebinarInstances.ts';
import { handleGetInstanceParticipants } from './handlers/getInstanceParticipants.ts';
import { handleGetWebinarRecordings } from './handlers/getWebinarRecordings.ts';
import { handleSyncSingleWebinar } from './handlers/syncSingleWebinar.ts';
import { handleCheckCredentialsStatus } from './handlers/checkCredentialsStatus.ts';

import { handleGetActualTimingData } from './handlers/getActualTimingData.ts';

Deno.serve(async (req) => {
  console.log('[zoom-api] Request received:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { action } = body;
    
    console.log(`[zoom-api] Received action: ${action}`);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    // Get Zoom credentials
    const credentials = await getZoomCredentials(supabase, user.id);
    if (!credentials) {
      throw new Error('No Zoom credentials found');
    }

    // Route to appropriate handler
    switch (action) {
      case 'list-webinars':
        return await handleListWebinars(req, supabase, user, credentials, body.force_sync || false);
      
      case 'get-webinar':
        return await handleGetWebinar(req, supabase, user, credentials, body.id);
      
      case 'get-participants':
        return await handleGetParticipants(req, supabase, user, credentials, body.id);
      
      case 'update-participants':
        return await handleUpdateWebinarParticipants(req, supabase, user, credentials, body.id);
      
      case 'get-webinar-instances':
        return await handleGetWebinarInstances(req, supabase, user, credentials, body.id);
      
      case 'get-instance-participants':
        return await handleGetInstanceParticipants(req, supabase, user, credentials, body.webinar_id, body.instance_id);
      
      case 'get-webinar-recordings':
        return await handleGetWebinarRecordings(req, supabase, user, credentials, body.id);
      
      case 'sync-single-webinar':
        return await handleSyncSingleWebinar(req, supabase, user, credentials, body.webinar_id);
      
      case 'get-actual-timing-data':
        return await handleGetActualTimingData(req, supabase, user, credentials, body.webinar_id);
      
      case 'check-credentials-status':
        return await handleCheckCredentialsStatus(req, supabase, user, credentials);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[zoom-api] Error in action:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
