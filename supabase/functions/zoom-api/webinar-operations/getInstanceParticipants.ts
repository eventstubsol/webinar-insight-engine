
import { Request } from "https://deno.land/std@0.177.0/http/server.ts";
import { createErrorResponse, createSuccessResponse } from "../cors.ts";
import { sleep } from "../helpers.ts";
import { getZoomJwtToken, ZoomApiClient } from "../auth/index.ts";

export async function handleGetInstanceParticipants(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  webinarId: string,
  instanceId: string,
  apiClient: ZoomApiClient
) {
  try {
    console.log(`[zoom-api][get-instance-participants] Getting participants for webinar ${webinarId}, instance ${instanceId}`);
    
    // Get current token
    const token = await getZoomJwtToken(
      credentials.account_id, 
      credentials.client_id, 
      credentials.client_secret
    );
    
    // Create API client if not provided
    const client = apiClient || new ZoomApiClient(token);
    
    // Get participants for this instance
    let participants = [];
    let nextPageToken = '';
    let pageSize = 300;
    
    do {
      const url = `/past_webinars/${instanceId}/participants?page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`;
      const response = await client.request(url, {}, 'heavy');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Zoom API error: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.participants && Array.isArray(data.participants)) {
        participants = [...participants, ...data.participants];
      }
      
      nextPageToken = data.next_page_token || '';
      
      // If there are more pages, wait a bit to avoid rate limiting
      if (nextPageToken) {
        await sleep(200);
      }
    } while (nextPageToken);
    
    console.log(`[zoom-api][get-instance-participants] Retrieved ${participants.length} participants`);
    
    return createSuccessResponse({ participants });
  } catch (error) {
    console.error('[zoom-api][get-instance-participants] Error:', error);
    return createErrorResponse(`Failed to get instance participants: ${error.message}`, 400);
  }
}
