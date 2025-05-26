import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from './cors.ts';
import { handleListWebinars } from './handlers/listWebinars.ts';
import { handleGetWebinar } from './handlers/getWebinar.ts';
import { handleGetParticipants } from './handlers/getParticipants.ts';
import { handleGetWebinarInstances } from './handlers/getWebinarInstances.ts';
import { handleGetInstanceParticipants } from './handlers/getInstanceParticipants.ts';
import { handleUpdateWebinarParticipants } from './handlers/updateWebinarParticipants.ts';
import { handleGetWebinarRecordings } from './handlers/getWebinarRecordings.ts';
import { handleSyncSingleWebinar } from './handlers/syncSingleWebinar.ts';
import { handleFetchTimingData } from './handlers/fetchTimingData.ts';
import { handleCheckCredentialsStatus } from './credentials.ts';
import { handleAsyncSync } from './handlers/asyncSync.ts';

console.log('[zoom-api] Function starting up');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    
    console.log(`[zoom-api] Received action: ${action}`);

    switch (action) {
      case 'list-webinars':
        return await handleListWebinars(req);
      
      case 'get-webinar':
        return await handleGetWebinar(req);
      
      case 'get-webinar-participants':
        return await handleGetParticipants(req);
      
      case 'update-webinar-participants':
        return await handleUpdateWebinarParticipants(req);
      
      case 'get-webinar-instances':
        return await handleGetWebinarInstances(req);
      
      case 'get-instance-participants':
        return await handleGetInstanceParticipants(req);
      
      case 'get-webinar-recordings':
        return await handleGetWebinarRecordings(req);
      
      case 'sync-single-webinar':
        return await handleSyncSingleWebinar(req);
      
      case 'fetch-timing-data':
        return await handleFetchTimingData(req);
      
      case 'check-credentials-status':
        return await handleCheckCredentialsStatus(req);
      
      case 'start-async-sync':
      case 'get-sync-status':
        return await handleAsyncSync(req);
      
      default:
        console.log(`[zoom-api] Unknown action: ${action}`);
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (error) {
    console.error('[zoom-api] Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
