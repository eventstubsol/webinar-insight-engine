
import { Request } from "https://deno.land/std@0.177.0/http/server.ts";
import { createErrorResponse, createSuccessResponse } from "../cors.ts";
import { getZoomJwtToken, ZoomApiClient } from "../auth/index.ts";

export async function handleGetWebinarExtendedData(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  webinarId: string,
  apiClient: ZoomApiClient
) {
  try {
    console.log(`[zoom-api][get-webinar-extended-data] Getting extended data for webinar ${webinarId}`);
    
    // Get current token
    const token = await getZoomJwtToken(
      credentials.account_id, 
      credentials.client_id, 
      credentials.client_secret
    );
    
    // Create API client if not provided
    const client = apiClient || new ZoomApiClient(token);
    
    // Get webinar details to check if it's past or upcoming
    const webinarResponse = await client.request(`/webinars/${webinarId}`, {}, 'light');
    
    if (!webinarResponse.ok) {
      const errorData = await webinarResponse.json();
      throw new Error(`Zoom API error: ${errorData.message || webinarResponse.statusText}`);
    }
    
    const webinar = await webinarResponse.json();
    const isPastWebinar = webinar.status === 'ended';
    
    // Initialize result object
    const result = {
      webinar: webinar,
      qanda: [],
      polls: [],
      recordings: []
    };
    
    // Only get Q&A and polls for past webinars
    if (isPastWebinar) {
      try {
        // Get Q&A
        const qandaResponse = await client.request(`/past_webinars/${webinar.uuid}/qa`, {}, 'heavy');
        
        if (qandaResponse.ok) {
          const qandaData = await qandaResponse.json();
          result.qanda = qandaData.questions || [];
        }
      } catch (error) {
        console.error(`[zoom-api][get-webinar-extended-data] Error getting Q&A: ${error.message}`);
      }
      
      try {
        // Get polls
        const pollsResponse = await client.request(`/past_webinars/${webinar.uuid}/polls`, {}, 'heavy');
        
        if (pollsResponse.ok) {
          const pollsData = await pollsResponse.json();
          result.polls = pollsData.questions || [];
        }
      } catch (error) {
        console.error(`[zoom-api][get-webinar-extended-data] Error getting polls: ${error.message}`);
      }
      
      try {
        // Get recordings
        const recordingsResponse = await client.request(`/webinars/${webinarId}/recordings`, {}, 'resource');
        
        if (recordingsResponse.ok) {
          const recordingsData = await recordingsResponse.json();
          result.recordings = recordingsData.recording_files || [];
        }
      } catch (error) {
        console.error(`[zoom-api][get-webinar-extended-data] Error getting recordings: ${error.message}`);
      }
    }
    
    // Save extended data to database
    try {
      const { error: upsertError } = await supabaseAdmin
        .from('zoom_webinar_extended_data')
        .upsert({
          user_id: user.id,
          webinar_id: webinarId,
          qanda: result.qanda,
          polls: result.polls,
          recordings: result.recordings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,webinar_id',
          ignoreDuplicates: false
        });
      
      if (upsertError) {
        console.error(`[zoom-api][get-webinar-extended-data] Error saving extended data: ${upsertError.message}`);
      }
    } catch (dbError) {
      console.error(`[zoom-api][get-webinar-extended-data] Database error: ${dbError.message}`);
    }
    
    return createSuccessResponse(result);
  } catch (error) {
    console.error('[zoom-api][get-webinar-extended-data] Error:', error);
    return createErrorResponse(`Failed to get extended webinar data: ${error.message}`, 400);
  }
}
