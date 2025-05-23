
import { Request } from "https://deno.land/std@0.177.0/http/server.ts";
import { createErrorResponse, createSuccessResponse } from "../cors.ts";
import { getZoomJwtToken, ZoomApiClient } from "../auth/index.ts";

export async function handleGetWebinarInstances(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  webinarId: string,
  apiClient: ZoomApiClient
) {
  try {
    console.log(`[zoom-api][get-webinar-instances] Getting instances for webinar ${webinarId}`);
    
    // Get current token
    const token = await getZoomJwtToken(
      credentials.account_id, 
      credentials.client_id, 
      credentials.client_secret
    );
    
    // Create API client if not provided
    const client = apiClient || new ZoomApiClient(token);
    
    // Get webinar instances
    const response = await client.request(`/webinars/${webinarId}/instances`, {}, 'medium');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Zoom API error: ${errorData.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.instances || !Array.isArray(data.instances)) {
      return createSuccessResponse({ instances: [] });
    }
    
    return createSuccessResponse({ instances: data.instances });
  } catch (error) {
    console.error('[zoom-api][get-webinar-instances] Error:', error);
    return createErrorResponse(`Failed to get webinar instances: ${error.message}`, 400);
  }
}
