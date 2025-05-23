import { Request } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, addCorsHeaders, createErrorResponse, createSuccessResponse } from "./cors.ts";
import { recordSyncHistory, sleep, formatDate } from "./helpers.ts";
import { getZoomJwtToken, ZoomApiClient } from "./auth.ts";

// Example of updating one of the main handler functions:
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
      .select('webinar_id, webinar_uuid, topic')
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
