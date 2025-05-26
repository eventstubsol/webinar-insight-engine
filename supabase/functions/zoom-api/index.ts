
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { corsHeaders } from './cors.ts';
import { getZoomCredentials, handleSaveCredentials, handleCheckCredentialsStatus, handleVerifyCredentials } from './credentials.ts';
import { getZoomJwtToken } from './auth.ts';

import { handleListWebinars } from './handlers/listWebinars.ts';
import { handleGetWebinar } from './handlers/getWebinar.ts';
import { handleGetParticipants } from './handlers/getParticipants.ts';
import { handleGetWebinarInstances } from './handlers/getWebinarInstances.ts';
import { handleGetInstanceParticipants } from './handlers/getInstanceParticipants.ts';
import { handleUpdateWebinarParticipants } from './handlers/updateWebinarParticipants.ts';
import { handleSyncSingleWebinar } from './handlers/syncSingleWebinar.ts';
import { handleGetWebinarRecordings } from './handlers/getWebinarRecordings.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // CRITICAL FIX: Increase timeout to 60 seconds to accommodate enhancement processing
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out after 60000ms')), 60000);
  });

  try {
    const result = await Promise.race([
      handleRequest(req),
      timeoutPromise
    ]);
    return result as Response;
  } catch (error) {
    console.error('[zoom-api] Error in index:', error);
    
    // Enhanced error response with timeout detection
    const isTimeout = error.message && error.message.includes('timed out');
    const errorResponse = {
      error: isTimeout ? 'Request timed out. Please try again with a smaller dataset.' : error.message,
      category: isTimeout ? 'timeout' : 'server_error',
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: isTimeout ? 408 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleRequest(req: Request): Promise<Response> {
  try {
    const { action, ...params } = await req.json();
    console.log(`[zoom-api] Received action: ${action}`);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    // Route to appropriate handler
    switch (action) {
      case 'check-credentials-status':
        return await handleCheckCredentialsStatus(req, supabase, user);
      
      case 'save-credentials':
        return await handleSaveCredentials(req, supabase, user, { action, ...params });
      
      case 'verify-credentials':
        const verifyCredentials = await getZoomCredentials(supabase, user.id);
        return await handleVerifyCredentials(req, supabase, user, verifyCredentials);
      
      case 'list-webinars':
        const listCredentials = await getZoomCredentials(supabase, user.id);
        return await handleListWebinars(req, supabase, user, listCredentials, params.force_sync || false);
      
      case 'get-webinar':
        const getWebinarCredentials = await getZoomCredentials(supabase, user.id);
        return await handleGetWebinar(req, supabase, user, getWebinarCredentials);
      
      case 'get-participants':
        const getParticipantsCredentials = await getZoomCredentials(supabase, user.id);
        return await handleGetParticipants(req, supabase, user, getParticipantsCredentials);
      
      case 'get-webinar-instances':
        const getInstancesCredentials = await getZoomCredentials(supabase, user.id);
        return await handleGetWebinarInstances(req, supabase, user, getInstancesCredentials);
      
      case 'get-instance-participants':
        const getInstanceParticipantsCredentials = await getZoomCredentials(supabase, user.id);
        return await handleGetInstanceParticipants(req, supabase, user, getInstanceParticipantsCredentials);
      
      case 'update-webinar-participants':
        const updateParticipantsCredentials = await getZoomCredentials(supabase, user.id);
        return await handleUpdateWebinarParticipants(req, supabase, user, updateParticipantsCredentials);
      
      case 'sync-single-webinar':
        const syncCredentials = await getZoomCredentials(supabase, user.id);
        return await handleSyncSingleWebinar(req, supabase, user, syncCredentials, params.webinar_id);
      
      case 'get-webinar-recordings':
        const recordingsCredentials = await getZoomCredentials(supabase, user.id);
        return await handleGetWebinarRecordings(req, supabase, user, recordingsCredentials, params.webinar_id);
      
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('[zoom-api] Error handling request:', error);
    throw error;
  }
}
