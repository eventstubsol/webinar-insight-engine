
import { corsHeaders } from './cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { handleListWebinars } from './handlers/listWebinars.ts';
import { handleGetWebinarDetails } from './handlers/getWebinarDetails.ts';
import { handleGetParticipants } from './handlers/getParticipants.ts';
import { handleUpdateWebinarParticipants } from './handlers/updateWebinarParticipants.ts';
import { handleGetWebinarInstances } from './handlers/getWebinarInstances.ts';
import { handleGetInstanceParticipants } from './handlers/getInstanceParticipants.ts';
import { handleGetWebinarRecordings } from './handlers/getWebinarRecordings.ts';
import { handleCheckCredentialsStatus } from './handlers/checkCredentialsStatus.ts';
import { handleSyncRegistrants } from './handlers/sync-registrants.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    console.log(`[zoom-api] Received action: ${action}`);

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No Authorization header');
    }

    // Get user from Supabase Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    // Get user's Zoom credentials
    const { data: credentials, error: credError } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (credError || !credentials) {
      throw new Error('No Zoom credentials found');
    }

    // Route to appropriate handler
    switch (action) {
      case 'list-webinars':
        return await handleListWebinars(req, supabase, user, credentials, params.force_sync);
      
      case 'get-webinar-details':
        return await handleGetWebinarDetails(req, supabase, user, credentials, params.id);
      
      case 'get-participants':
        return await handleGetParticipants(req, supabase, user, credentials, params.id);
      
      case 'update-webinar-participants':
        return await handleUpdateWebinarParticipants(req, supabase, user, credentials);
      
      case 'get-webinar-instances':
        return await handleGetWebinarInstances(req, supabase, user, credentials, params.webinar_id);
      
      case 'get-instance-participants':
        return await handleGetInstanceParticipants(req, supabase, user, credentials, params.webinar_id, params.instance_id);
      
      case 'get-webinar-recordings':
        return await handleGetWebinarRecordings(req, supabase, user, credentials, params.webinar_id);
      
      case 'check-credentials-status':
        return await handleCheckCredentialsStatus(req, supabase, user, credentials);
      
      case 'sync-registrants':
        return await handleSyncRegistrants(req, supabase, user, credentials);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[zoom-api] Error:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'An error occurred',
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
