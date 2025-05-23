
import { Request } from "https://deno.land/std@0.177.0/http/server.ts";
import { createErrorResponse, createSuccessResponse } from "../cors.ts";
import { sleep } from "../helpers.ts";
import { getZoomJwtToken, ZoomApiClient } from "../auth/index.ts";

export async function handleGetParticipants(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  webinarId: string,
  apiClient: ZoomApiClient
) {
  try {
    console.log(`[zoom-api][get-participants] Getting participants for webinar ${webinarId}`);
    
    // Get current token
    const token = await getZoomJwtToken(
      credentials.account_id, 
      credentials.client_id, 
      credentials.client_secret
    );
    
    // Create API client if not provided
    const client = apiClient || new ZoomApiClient(token);
    
    // First, check if we have this data in the database
    const { data: dbParticipants, error: dbError } = await supabaseAdmin
      .from('zoom_webinar_participants')
      .select('*')
      .eq('user_id', user.id)
      .eq('webinar_id', webinarId)
      .single();
    
    if (!dbError && dbParticipants && dbParticipants.registrants && dbParticipants.attendees) {
      console.log(`[zoom-api][get-participants] Found participants in database for webinar ${webinarId}`);
      return createSuccessResponse({
        registrants: dbParticipants.registrants,
        attendees: dbParticipants.attendees,
        from_cache: true
      });
    }
    
    // Get webinar details to check if it's past or upcoming
    const webinarResponse = await client.request(`/webinars/${webinarId}`, {}, 'light');
    
    if (!webinarResponse.ok) {
      const errorData = await webinarResponse.json();
      throw new Error(`Zoom API error: ${errorData.message || webinarResponse.statusText}`);
    }
    
    const webinar = await webinarResponse.json();
    const isPastWebinar = webinar.status === 'ended';
    
    // Get registrants
    let registrants = [];
    let nextPageToken = '';
    let pageSize = 300;
    
    do {
      const registrantsUrl = `/webinars/${webinarId}/registrants?page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`;
      const registrantsResponse = await client.request(registrantsUrl, {}, 'medium');
      
      if (!registrantsResponse.ok) {
        const errorData = await registrantsResponse.json();
        console.error(`[zoom-api][get-participants] Error getting registrants: ${errorData.message}`);
        break;
      }
      
      const registrantsData = await registrantsResponse.json();
      
      if (registrantsData.registrants && Array.isArray(registrantsData.registrants)) {
        registrants = [...registrants, ...registrantsData.registrants];
      }
      
      nextPageToken = registrantsData.next_page_token || '';
      
      // If there are more pages, wait a bit to avoid rate limiting
      if (nextPageToken) {
        await sleep(100);
      }
    } while (nextPageToken);
    
    console.log(`[zoom-api][get-participants] Retrieved ${registrants.length} registrants`);
    
    // Get attendees for past webinars
    let attendees = [];
    
    if (isPastWebinar) {
      nextPageToken = '';
      
      do {
        const attendeesUrl = `/past_webinars/${webinar.uuid}/participants?page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`;
        const attendeesResponse = await client.request(attendeesUrl, {}, 'heavy');
        
        if (!attendeesResponse.ok) {
          const errorData = await attendeesResponse.json();
          console.error(`[zoom-api][get-participants] Error getting attendees: ${errorData.message}`);
          break;
        }
        
        const attendeesData = await attendeesResponse.json();
        
        if (attendeesData.participants && Array.isArray(attendeesData.participants)) {
          attendees = [...attendees, ...attendeesData.participants];
        }
        
        nextPageToken = attendeesData.next_page_token || '';
        
        // If there are more pages, wait a bit to avoid rate limiting
        if (nextPageToken) {
          await sleep(200);
        }
      } while (nextPageToken);
      
      console.log(`[zoom-api][get-participants] Retrieved ${attendees.length} attendees`);
    }
    
    // Save to database for future use
    const { error: upsertError } = await supabaseAdmin
      .from('zoom_webinar_participants')
      .upsert({
        user_id: user.id,
        webinar_id: webinarId,
        registrants: registrants,
        attendees: attendees,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,webinar_id',
        ignoreDuplicates: false
      });
    
    if (upsertError) {
      console.error(`[zoom-api][get-participants] Error saving participants: ${upsertError.message}`);
    }
    
    return createSuccessResponse({
      registrants,
      attendees
    });
  } catch (error) {
    console.error('[zoom-api][get-participants] Error:', error);
    return createErrorResponse(`Failed to get participants: ${error.message}`, 400);
  }
}
