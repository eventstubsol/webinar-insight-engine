
import { Request } from "https://deno.land/std@0.177.0/http/server.ts";
import { createErrorResponse, createSuccessResponse } from "../cors.ts";
import { recordSyncHistory, sleep } from "../helpers.ts";
import { getZoomJwtToken, ZoomApiClient } from "../auth/index.ts";

export async function handleUpdateWebinarParticipants(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  apiClient: ZoomApiClient
) {
  try {
    console.log(`[zoom-api][update-webinar-participants] Updating participants for user ${user.id}`);
    
    // Get current token
    const token = await getZoomJwtToken(
      credentials.account_id, 
      credentials.client_id, 
      credentials.client_secret
    );
    
    // Create API client if not provided
    const client = apiClient || new ZoomApiClient(token);
    
    // Get past webinars that need participant data
    const { data: pastWebinars, error: dbError } = await supabaseAdmin
      .from('zoom_webinars')
      .select('webinar_id, webinar_uuid, topic, raw_data')
      .eq('user_id', user.id)
      .eq('status', 'ended')
      .order('start_time', { ascending: false })
      .limit(10);  // Limit to 10 most recent webinars to avoid overloading
    
    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }
    
    if (!pastWebinars || pastWebinars.length === 0) {
      return createSuccessResponse({
        message: 'No past webinars found that need participant data',
        updated: 0
      });
    }
    
    console.log(`[zoom-api][update-webinar-participants] Found ${pastWebinars.length} past webinars`);
    
    let updatedCount = 0;
    
    // Process each webinar
    for (const webinar of pastWebinars) {
      try {
        // Get registrants
        let registrants = [];
        let nextPageToken = '';
        let pageSize = 300;
        
        do {
          const registrantsUrl = `/webinars/${webinar.webinar_id}/registrants?page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`;
          const registrantsResponse = await client.request(registrantsUrl, {}, 'medium');
          
          if (!registrantsResponse.ok) {
            const errorData = await registrantsResponse.json();
            console.error(`[zoom-api][update-webinar-participants] Error getting registrants for ${webinar.webinar_id}: ${errorData.message}`);
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
        
        // Get attendees
        let attendees = [];
        nextPageToken = '';
        
        do {
          const attendeesUrl = `/past_webinars/${webinar.webinar_uuid}/participants?page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`;
          const attendeesResponse = await client.request(attendeesUrl, {}, 'heavy');
          
          if (!attendeesResponse.ok) {
            const errorData = await attendeesResponse.json();
            console.error(`[zoom-api][update-webinar-participants] Error getting attendees for ${webinar.webinar_id}: ${errorData.message}`);
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
        
        // Save to database
        const { error: upsertError } = await supabaseAdmin
          .from('zoom_webinar_participants')
          .upsert({
            user_id: user.id,
            webinar_id: webinar.webinar_id,
            registrants: registrants,
            attendees: attendees,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,webinar_id',
            ignoreDuplicates: false
          });
        
        if (upsertError) {
          console.error(`[zoom-api][update-webinar-participants] Error saving participants for ${webinar.webinar_id}: ${upsertError.message}`);
        } else {
          updatedCount++;
          console.log(`[zoom-api][update-webinar-participants] Updated participants for webinar ${webinar.webinar_id}: ${registrants.length} registrants, ${attendees.length} attendees`);
        }
        
        // Update the webinar record with counts
        const { error: updateError } = await supabaseAdmin
          .from('zoom_webinars')
          .update({
            raw_data: {
              ...webinar.raw_data,
              registrants_count: registrants.length,
              participants_count: attendees.length
            }
          })
          .eq('user_id', user.id)
          .eq('webinar_id', webinar.webinar_id);
        
        if (updateError) {
          console.error(`[zoom-api][update-webinar-participants] Error updating webinar counts for ${webinar.webinar_id}: ${updateError.message}`);
        }
        
        // Wait between webinars to avoid rate limiting
        await sleep(500);
      } catch (error) {
        console.error(`[zoom-api][update-webinar-participants] Error processing webinar ${webinar.webinar_id}:`, error);
      }
    }
    
    // Record sync history
    await recordSyncHistory(
      supabaseAdmin,
      user.id,
      'participants',
      'success',
      updatedCount
    );
    
    return createSuccessResponse({
      message: `Updated participant data for ${updatedCount} webinars`,
      updated: updatedCount
    });
  } catch (error) {
    console.error('[zoom-api][update-webinar-participants] Error:', error);
    
    // Record sync failure
    try {
      await recordSyncHistory(
        supabaseAdmin,
        user.id,
        'participants',
        'error',
        0,
        error.message
      );
    } catch (recordError) {
      console.error('[zoom-api][update-webinar-participants] Error recording sync history:', recordError);
    }
    
    return createErrorResponse(`Failed to update participant data: ${error.message}`, 400);
  }
}
