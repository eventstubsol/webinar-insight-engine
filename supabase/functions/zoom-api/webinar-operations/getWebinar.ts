
import { Request } from "https://deno.land/std@0.177.0/http/server.ts";
import { createErrorResponse, createSuccessResponse } from "../cors.ts";
import { getZoomJwtToken, ZoomApiClient } from "../auth/index.ts";

export async function handleGetWebinar(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  webinarId: string,
  apiClient: ZoomApiClient
) {
  try {
    console.log(`[zoom-api][get-webinar] Getting webinar ${webinarId} for user ${user.id}`);
    
    // Get current token
    const token = await getZoomJwtToken(
      credentials.account_id, 
      credentials.client_id, 
      credentials.client_secret
    );
    
    // Create API client if not provided
    const client = apiClient || new ZoomApiClient(token);
    
    // Get webinar details
    const response = await client.request(`/webinars/${webinarId}`, {}, 'medium');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Zoom API error: ${errorData.message || response.statusText}`);
    }
    
    const webinar = await response.json();
    
    return createSuccessResponse(webinar);
  } catch (error) {
    console.error('[zoom-api][get-webinar] Error:', error);
    return createErrorResponse(`Failed to get webinar: ${error.message}`, 400);
  }
}
