
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';
import { listWebinars } from './handlers/listWebinars.ts';
import { getParticipants } from './handlers/getParticipants.ts';
import { getWebinar } from './handlers/getWebinar.ts';
import { getWebinarInstances } from './handlers/getWebinarInstances.ts';
import { getInstanceParticipants } from './handlers/getInstanceParticipants.ts';
import { updateParticipantData } from './handlers/updateWebinarParticipants.ts';
import { ParticipantDataProcessor } from './handlers/sync/participantDataProcessor.ts';
import { getZoomAccessToken } from './auth.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, id, force, webinarIds } = await req.json();
    
    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Verify the JWT and get user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    console.log(`[zoom-api] Handling action: ${action} for user: ${user.id}`);

    // Get Zoom access token
    const accessToken = await getZoomAccessToken(supabase, user.id);

    let result;

    switch (action) {
      case 'list-webinars':
        result = await listWebinars(supabase, accessToken, user.id, force);
        break;
        
      case 'get-participants':
        if (!id) throw new Error('Webinar ID is required for get-participants action');
        const participantResult = await getParticipants(supabase, accessToken, id, user.id);
        result = {
          success: true,
          attendees: participantResult.attendees,
          registrants: participantResult.registrants
        };
        break;
        
      case 'get-webinar':
        if (!id) throw new Error('Webinar ID is required for get-webinar action');
        result = await getWebinar(accessToken, id);
        break;
        
      case 'get-instances':
        if (!id) throw new Error('Webinar ID is required for get-instances action');
        result = await getWebinarInstances(supabase, accessToken, id, user.id);
        break;
        
      case 'get-instance-participants':
        if (!id) throw new Error('Instance ID is required for get-instance-participants action');
        result = await getInstanceParticipants(supabase, accessToken, id, user.id);
        break;
        
      case 'update-participants':
        result = await updateParticipantData(supabase, accessToken, user.id);
        break;
        
      case 'sync-webinar-participants':
        if (!id) throw new Error('Webinar ID is required for sync-webinar-participants action');
        const processor = new ParticipantDataProcessor(supabase, user.id, accessToken);
        const syncResult = await processor.processWebinarParticipants(id);
        result = {
          success: true,
          message: `Synced webinar ${id}: ${syncResult.totalRegistrants} registrants, ${syncResult.totalAttendees} attendees`,
          ...syncResult
        };
        break;
        
      case 'bulk-sync-participants':
        if (!webinarIds || !Array.isArray(webinarIds)) {
          throw new Error('webinarIds array is required for bulk-sync-participants action');
        }
        
        const bulkProcessor = new ParticipantDataProcessor(supabase, user.id, accessToken);
        const bulkResults = [];
        const maxConcurrent = 2; // Conservative limit to avoid API rate limits
        
        console.log(`[zoom-api] Starting bulk sync for ${webinarIds.length} webinars`);
        
        for (let i = 0; i < webinarIds.length; i += maxConcurrent) {
          const batch = webinarIds.slice(i, i + maxConcurrent);
          
          const batchPromises = batch.map(async (webinarId: string) => {
            try {
              const syncResult = await bulkProcessor.processWebinarParticipants(webinarId);
              return { success: true, webinarId, ...syncResult };
            } catch (error) {
              return { 
                success: false, 
                webinarId, 
                error: error.message,
                totalRegistrants: 0,
                totalAttendees: 0
              };
            }
          });
          
          const batchResults = await Promise.allSettled(batchPromises);
          batchResults.forEach(result => {
            if (result.status === 'fulfilled') {
              bulkResults.push(result.value);
            }
          });
          
          // Rate limiting between batches
          if (i + maxConcurrent < webinarIds.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        const successful = bulkResults.filter(r => r.success).length;
        result = {
          success: true,
          message: `Bulk sync completed: ${successful}/${webinarIds.length} webinars processed successfully`,
          results: bulkResults,
          totalSynced: successful
        };
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[zoom-api] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred',
        success: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
