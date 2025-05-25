import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';
import { listWebinars } from './handlers/listWebinars.ts';
import { getParticipants } from './handlers/getParticipants.ts';
import { getWebinar } from './handlers/getWebinar.ts';
import { getWebinarInstances } from './handlers/getWebinarInstances.ts';
import { getInstanceParticipants } from './handlers/getInstanceParticipants.ts';
import { updateParticipantData } from './handlers/updateWebinarParticipants.ts';
import { ParticipantDataProcessor } from './handlers/sync/participantDataProcessor.ts';
import { getZoomAccessToken } from './auth.ts';
import { saveCredentials } from './handlers/saveCredentials.ts';

// Set a default timeout for all fetch operations
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Utility function to add timeout to fetch operations
const fetchWithTimeout = (resource: string, options: RequestInit, timeout = DEFAULT_TIMEOUT) => {
  // Create an abort controller to handle timeout
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  // Add the abort signal to options
  const opts = { ...options, signal: controller.signal };
  
  return fetch(resource, opts)
    .then(response => {
      clearTimeout(id);
      return response;
    })
    .catch(error => {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout / 1000} seconds`);
      }
      throw error;
    });
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (error) {
      console.error('[zoom-api] Error parsing request JSON:', error);
      throw new Error('Invalid JSON in request body');
    }
    
    const { action, id, force, webinarIds } = requestData;
    
    console.log(`[zoom-api] Received request with action: ${action}`);
    
    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[zoom-api] Missing Supabase environment variables');
      throw new Error('Server configuration error: Missing required environment variables');
    }
    
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Verify the JWT and get user
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
      
      if (authError || !user) {
        console.error('[zoom-api] Authentication error:', authError);
        throw new Error('Invalid authentication token');
      }

      console.log(`[zoom-api] Handling action: ${action} for user: ${user.id}`);

      let result;

      switch (action) {
        case 'save-credentials':
          // Handle saving and verifying credentials
          if (!requestData.account_id || !requestData.client_id || !requestData.client_secret) {
            throw new Error('Account ID, Client ID, and Client Secret are required');
          }
          
          result = await saveCredentials(
            supabase, 
            user.id, 
            {
              account_id: requestData.account_id,
              client_id: requestData.client_id,
              client_secret: requestData.client_secret
            }
          );
          break;
          
        case 'list-webinars':
          // Get Zoom access token first for this and all other API operations
          const accessToken = await getZoomAccessToken(supabase, user.id);
          result = await listWebinars(supabase, accessToken, user.id, force);
          break;
          
        case 'get-participants':
          if (!id) throw new Error('Webinar ID is required for get-participants action');
          const accessToken2 = await getZoomAccessToken(supabase, user.id);
          const participantResult = await getParticipants(supabase, accessToken2, id, user.id);
          result = {
            success: true,
            attendees: participantResult.attendees,
            registrants: participantResult.registrants
          };
          break;
          
        case 'get-webinar':
          if (!id) throw new Error('Webinar ID is required for get-webinar action');
          const accessToken3 = await getZoomAccessToken(supabase, user.id);
          result = await getWebinar(accessToken3, id);
          break;
          
        case 'get-instances':
          if (!id) throw new Error('Webinar ID is required for get-instances action');
          const accessToken4 = await getZoomAccessToken(supabase, user.id);
          result = await getWebinarInstances(supabase, accessToken4, id, user.id);
          break;
          
        case 'get-instance-participants':
          if (!id) throw new Error('Instance ID is required for get-instance-participants action');
          const accessToken5 = await getZoomAccessToken(supabase, user.id);
          result = await getInstanceParticipants(supabase, accessToken5, id, user.id);
          break;
          
        case 'update-participants':
          const accessToken6 = await getZoomAccessToken(supabase, user.id);
          result = await updateParticipantData(supabase, accessToken6, user.id);
          break;
          
        case 'sync-webinar-participants':
          if (!id) throw new Error('Webinar ID is required for sync-webinar-participants action');
          const accessToken7 = await getZoomAccessToken(supabase, user.id);
          const processor = new ParticipantDataProcessor(supabase, user.id, accessToken7);
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
          
          const accessToken8 = await getZoomAccessToken(supabase, user.id);
          const bulkProcessor = new ParticipantDataProcessor(supabase, user.id, accessToken8);
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
                console.error(`[zoom-api] Error processing webinar ${webinarId}:`, error);
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
      console.error('[zoom-api] Supabase client error:', error);
      throw error;
    }
  } catch (error) {
    console.error('[zoom-api] Error:', error);
    
    // Format error response based on type
    let errorMessage = 'An unknown error occurred';
    let errorCode = 'unknown_error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error types
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        errorCode = 'timeout_error';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorCode = 'network_error';
      } else if (error.message.includes('authentication') || error.message.includes('auth')) {
        errorCode = 'auth_error';
      } else if (error.message.includes('scope')) {
        errorCode = 'missing_scopes';
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: errorCode,
        success: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});