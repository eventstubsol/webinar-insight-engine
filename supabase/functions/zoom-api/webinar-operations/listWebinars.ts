
import { Request } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, createErrorResponse, createSuccessResponse } from "../cors.ts";
import { recordSyncHistory, sleep } from "../helpers.ts";
import { getZoomJwtToken, ZoomApiClient } from "../auth/index.ts";

export async function handleListWebinars(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  forceSync: boolean = false,
  apiClient: ZoomApiClient
) {
  try {
    console.log(`[zoom-api][list-webinars] Starting action for user ${user.id} with force_sync=${forceSync}`);
    
    // Get current token
    const token = await getZoomJwtToken(
      credentials.account_id, 
      credentials.client_id, 
      credentials.client_secret
    );
    
    // Create API client if not provided
    const client = apiClient || new ZoomApiClient(token);
    
    // Check if we need to sync or can use cached data
    if (!forceSync) {
      // Check if we have recent data in the database
      const { data: lastSync, error: syncError } = await supabaseAdmin
        .from('zoom_sync_history')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('sync_type', 'webinars')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!syncError && lastSync && lastSync.length > 0) {
        const lastSyncTime = new Date(lastSync[0].created_at);
        const now = new Date();
        const hoursSinceLastSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);
        
        // If last sync was less than 1 hour ago, return cached data
        if (hoursSinceLastSync < 1) {
          console.log(`[zoom-api][list-webinars] Using cached data from ${hoursSinceLastSync.toFixed(2)} hours ago`);
          
          // Get webinars from database
          const { data: webinars, error: webinarsError } = await supabaseAdmin
            .from('zoom_webinars')
            .select('*')
            .eq('user_id', user.id)
            .order('start_time', { ascending: false });
          
          if (!webinarsError && webinars && webinars.length > 0) {
            // Transform webinars to the expected format
            const webinarsTransformed = webinars.map(item => ({
              id: item.webinar_id,
              uuid: item.webinar_uuid,
              topic: item.topic,
              start_time: item.start_time,
              duration: item.duration,
              timezone: item.timezone,
              agenda: item.agenda,
              host_email: item.host_email,
              status: item.status,
              type: item.type,
              registrants_count: item.raw_data?.registrants_count || 0,
              participants_count: item.raw_data?.participants_count || 0,
              raw_data: item.raw_data
            }));
            
            return createSuccessResponse({
              webinars: webinarsTransformed,
              syncResults: {
                timestamp: lastSync[0].created_at,
                itemsUpdated: 0,
                force: forceSync,
                cached: true
              }
            });
          }
        }
      }
    }
    
    // Use the client to make the API request with proper rate limiting
    const response = await client.request('/users/me/webinars?page_size=300', {}, 'medium');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Zoom API error: ${errorData.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.webinars || !Array.isArray(data.webinars)) {
      throw new Error('Invalid response format from Zoom API');
    }
    
    console.log(`[zoom-api][list-webinars] Retrieved ${data.webinars.length} webinars from Zoom API`);
    
    // Get existing webinars from database
    const { data: existingWebinars, error: dbError } = await supabaseAdmin
      .from('zoom_webinars')
      .select('webinar_id, updated_at')
      .eq('user_id', user.id);
    
    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }
    
    // Create a map of existing webinars for quick lookup
    const existingWebinarMap = new Map();
    if (existingWebinars) {
      existingWebinars.forEach(item => {
        existingWebinarMap.set(item.webinar_id, item.updated_at);
      });
    }
    
    // Prepare webinars for database operations
    const webinarsToUpdate = [];
    const webinarsTransformed = [];
    
    for (const webinar of data.webinars) {
      // Get additional data for each webinar
      let registrantsCount = 0;
      let participantsCount = 0;
      
      try {
        // Get registrants count if webinar is not in the past
        if (webinar.start_time && new Date(webinar.start_time) > new Date()) {
          const registrantsResponse = await client.request(
            `/webinars/${webinar.id}/registrants?page_size=1`,
            {},
            'light'
          );
          
          if (registrantsResponse.ok) {
            const registrantsData = await registrantsResponse.json();
            registrantsCount = registrantsData.total_records || 0;
          }
        }
        
        // Get participants count for past webinars
        if (webinar.status === 'ended') {
          const participantsResponse = await client.request(
            `/past_webinars/${webinar.uuid}/participants?page_size=1`,
            {},
            'medium'
          );
          
          if (participantsResponse.ok) {
            const participantsData = await participantsResponse.json();
            participantsCount = participantsData.total_records || 0;
          }
        }
      } catch (error) {
        console.error(`[zoom-api][list-webinars] Error fetching additional data for webinar ${webinar.id}:`, error);
      }
      
      // Add counts to raw data
      const rawData = {
        ...webinar,
        registrants_count: registrantsCount,
        participants_count: participantsCount
      };
      
      // Transform for response
      webinarsTransformed.push({
        id: webinar.id,
        uuid: webinar.uuid,
        topic: webinar.topic,
        start_time: webinar.start_time,
        duration: webinar.duration,
        timezone: webinar.timezone,
        agenda: webinar.agenda,
        host_email: webinar.host_email,
        status: webinar.status,
        type: webinar.type,
        registrants_count: registrantsCount,
        participants_count: participantsCount,
        raw_data: rawData
      });
      
      // Check if we need to update this webinar in the database
      const existingUpdatedAt = existingWebinarMap.get(webinar.id);
      const needsUpdate = !existingUpdatedAt || forceSync;
      
      if (needsUpdate) {
        webinarsToUpdate.push({
          user_id: user.id,
          webinar_id: webinar.id,
          webinar_uuid: webinar.uuid,
          topic: webinar.topic,
          start_time: webinar.start_time,
          duration: webinar.duration,
          timezone: webinar.timezone,
          agenda: webinar.agenda,
          host_email: webinar.host_email,
          status: webinar.status,
          type: webinar.type,
          raw_data: rawData
        });
      }
    }
    
    // Update database if there are webinars to update
    if (webinarsToUpdate.length > 0) {
      console.log(`[zoom-api][list-webinars] Updating ${webinarsToUpdate.length} webinars in database`);
      
      // Use upsert to insert or update webinars
      const { error: upsertError } = await supabaseAdmin
        .from('zoom_webinars')
        .upsert(webinarsToUpdate, {
          onConflict: 'user_id,webinar_id',
          ignoreDuplicates: false
        });
      
      if (upsertError) {
        throw new Error(`Database upsert error: ${upsertError.message}`);
      }
      
      // Record sync history
      await recordSyncHistory(
        supabaseAdmin,
        user.id,
        'webinars',
        'success',
        webinarsToUpdate.length
      );
    } else {
      console.log('[zoom-api][list-webinars] No webinars to update');
      
      // Record sync history with 0 updates
      await recordSyncHistory(
        supabaseAdmin,
        user.id,
        'webinars',
        'success',
        0
      );
    }
    
    return createSuccessResponse({
      webinars: webinarsTransformed,
      syncResults: {
        timestamp: new Date().toISOString(),
        itemsUpdated: webinarsToUpdate.length,
        force: forceSync
      }
    });
  } catch (error) {
    console.error('[zoom-api][list-webinars] Error:', error);
    
    // Record sync failure
    try {
      await recordSyncHistory(
        supabaseAdmin,
        user.id,
        'webinars',
        'error',
        0,
        error.message
      );
    } catch (recordError) {
      console.error('[zoom-api][list-webinars] Error recording sync history:', recordError);
    }
    
    return createErrorResponse(`Failed to list webinars: ${error.message}`, 400);
  }
}
