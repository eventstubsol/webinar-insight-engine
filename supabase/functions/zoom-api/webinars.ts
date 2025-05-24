import { getValidAccessToken } from "./auth.ts";

export async function handleGetWebinar(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  id: string
): Promise<Response> {
  try {
    // Get access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user.id, credentials);

    // Fetch webinar from Zoom API
    const webinarResponse = await fetch(`https://api.zoom.us/v2/webinars/${id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!webinarResponse.ok) {
      const errorText = await webinarResponse.text();
      console.error('Zoom API error:', errorText);
      throw new Error(`Zoom API error: ${webinarResponse.status} ${errorText}`);
    }

    const webinarData = await webinarResponse.json();

    return new Response(JSON.stringify(webinarData), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch webinar' }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
}

export async function handleGetParticipants(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  id: string
): Promise<Response> {
  try {
    // Get access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user.id, credentials);

    // Fetch registrants from Zoom API
    const registrantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${id}/registrants?status=approved`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!registrantsResponse.ok) {
      const errorText = await registrantsResponse.text();
      console.error('Zoom API error (registrants):', errorText);
      throw new Error(`Zoom API error (registrants): ${registrantsResponse.status} ${errorText}`);
    }

    const registrantsData = await registrantsResponse.json();

    // Fetch attendees from Zoom API
    const attendeesResponse = await fetch(`https://api.zoom.us/v2/webinars/${id}/participants`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!attendeesResponse.ok) {
      const errorText = await attendeesResponse.text();
      console.error('Zoom API error (attendees):', errorText);
      throw new Error(`Zoom API error (attendees): ${attendeesResponse.status} ${errorText}`);
    }

    const attendeesData = await attendeesResponse.json();

    return new Response(JSON.stringify({
      registrants: registrantsData.registrants || [],
      attendees: attendeesData.participants || []
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch participants' }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
}

export async function handleUpdateWebinarParticipants(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any
): Promise<Response> {
  try {
    console.log(`[handleUpdateWebinarParticipants] Starting for user ${user.id}`);

    // Get access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user.id, credentials);

    // Fetch all webinars from the database for the user
    const { data: webinars, error: dbError } = await supabaseAdmin
      .from('zoom_webinars')
      .select('webinar_id')
      .eq('user_id', user.id);

    if (dbError) {
      console.error('[handleUpdateWebinarParticipants] DB error fetching webinars:', dbError);
      throw new Error(`DB error fetching webinars: ${dbError.message}`);
    }

    if (!webinars || webinars.length === 0) {
      console.log('[handleUpdateWebinarParticipants] No webinars found for user');
      return new Response(JSON.stringify({ message: 'No webinars found for user', updated: 0 }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    let updatedCount = 0;

    // Iterate through each webinar and update participants count
    for (const webinar of webinars) {
      try {
        // Fetch participants from Zoom API
        const participantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar.webinar_id}/participants`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!participantsResponse.ok) {
          const errorText = await participantsResponse.text();
          console.error(`[handleUpdateWebinarParticipants] Zoom API error for webinar ${webinar.webinar_id}:`, errorText);
          continue; // Skip to the next webinar
        }

        const participantsData = await participantsResponse.json();
        const participantsCount = participantsData.total_records || 0;

        // Update the webinar in the database with the participants count
        const { error: updateError } = await supabaseAdmin
          .from('zoom_webinars')
          .update({ participants_count: participantsCount })
          .eq('webinar_id', webinar.webinar_id)
          .eq('user_id', user.id);

        if (updateError) {
          console.error(`[handleUpdateWebinarParticipants] DB error updating webinar ${webinar.webinar_id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`[handleUpdateWebinarParticipants] Updated participants count for webinar ${webinar.webinar_id} to ${participantsCount}`);
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`[handleUpdateWebinarParticipants] Error processing webinar ${webinar.webinar_id}:`, error);
      }
    }

    console.log(`[handleUpdateWebinarParticipants] Successfully updated participants count for ${updatedCount} webinars`);

    return new Response(JSON.stringify({ message: 'Participant counts updated', updated: updatedCount }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('[handleUpdateWebinarParticipants] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to update webinar participants' }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
}

export async function handleGetWebinarInstances(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  webinarId: string
): Promise<Response> {
  try {
    // Get access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user.id, credentials);

    // Fetch webinar instances from Zoom API
    const instancesResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/instances`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!instancesResponse.ok) {
      const errorText = await instancesResponse.text();
      console.error('Zoom API error (instances):', errorText);
      throw new Error(`Zoom API error (instances): ${instancesResponse.status} ${errorText}`);
    }

    const instancesData = await instancesResponse.json();

    return new Response(JSON.stringify({
      instances: instancesData.occurrences || []
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch webinar instances' }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
}

export async function handleGetInstanceParticipants(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  webinarId: string,
  instanceId: string
): Promise<Response> {
  try {
    // Get access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user.id, credentials);

    // Fetch registrants for the instance from Zoom API
    const registrantsResponse = await fetch(
      `https://api.zoom.us/v2/webinars/${webinarId}/registrants?occurrence_id=${instanceId}&status=approved`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!registrantsResponse.ok) {
      const errorText = await registrantsResponse.text();
      console.error('Zoom API error (instance registrants):', errorText);
      throw new Error(`Zoom API error (instance registrants): ${registrantsResponse.status} ${errorText}`);
    }

    const registrantsData = await registrantsResponse.json();

    // Fetch attendees for the instance from Zoom API
    const attendeesResponse = await fetch(
      `https://api.zoom.us/v2/webinars/${webinarId}/participants?occurrence_id=${instanceId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!attendeesResponse.ok) {
      const errorText = await attendeesResponse.text();
      console.error('Zoom API error (instance attendees):', errorText);
      throw new Error(`Zoom API error (instance attendees): ${attendeesResponse.status} ${errorText}`);
    }

    const attendeesData = await attendeesResponse.json();

    return new Response(JSON.stringify({
      registrants: registrantsData.registrants || [],
      attendees: attendeesData.participants || []
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch instance participants' }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
}

export async function handleListWebinars(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  forceSync: boolean = false
): Promise<Response> {
  try {
    console.log(`[handleListWebinars] Starting for user ${user.id}, forceSync: ${forceSync}`);
    
    // Get workspace for the user (if applicable)
    const { data: workspaceData } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    
    const workspaceId = workspaceData?.workspace_id;

    // Check if we should force sync or if enough time has passed
    const { data: lastSync } = await supabaseAdmin
      .from('zoom_sync_history')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('sync_type', 'webinars')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const shouldSync = forceSync || !lastSync || 
      (new Date().getTime() - new Date(lastSync.created_at).getTime()) > 5 * 60 * 1000; // 5 minutes

    if (!shouldSync) {
      // Return cached data
      const { data: cachedWebinars } = await supabaseAdmin
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });

      return new Response(JSON.stringify({
        webinars: cachedWebinars || [],
        cached: true,
        lastSync: lastSync?.created_at
      }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user.id, credentials);
    
    // Fetch webinars from Zoom API with enhanced data collection
    const webinarsResponse = await fetch(
      `https://api.zoom.us/v2/users/me/webinars?page_size=300&type=all`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!webinarsResponse.ok) {
      const errorText = await webinarsResponse.text();
      console.error('[handleListWebinars] Zoom API error:', errorText);
      throw new Error(`Zoom API error: ${webinarsResponse.status} ${errorText}`);
    }

    const webinarsData = await webinarsResponse.json();
    console.log(`[handleListWebinars] Fetched ${webinarsData.webinars?.length || 0} webinars from Zoom`);

    let itemsUpdated = 0;
    const processedWebinars = [];

    // Process each webinar with enhanced data collection
    for (const webinar of webinarsData.webinars || []) {
      try {
        // Fetch detailed webinar information to get all missing fields
        const detailResponse = await fetch(
          `https://api.zoom.us/v2/webinars/${webinar.id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        let detailedWebinar = webinar;
        if (detailResponse.ok) {
          detailedWebinar = await detailResponse.json();
          console.log(`[handleListWebinars] Fetched detailed data for webinar ${webinar.id}`);
        }

        // Extract comprehensive webinar data including all missing fields
        const comprehensiveRawData = {
          ...detailedWebinar,
          // Preserve original API response
          original_list_data: webinar,
          detailed_data: detailedWebinar,
          // Extract settings safely
          settings: detailedWebinar.settings || {},
          // Extract recurrence if present
          recurrence: detailedWebinar.recurrence,
          // Extract tracking fields if present
          tracking_fields: detailedWebinar.tracking_fields,
          // Extract occurrences for recurring webinars
          occurrences: detailedWebinar.occurrences,
          // Additional metadata
          fetched_at: new Date().toISOString(),
          api_version: 'v2'
        };

        // Prepare data for database insertion with enhanced field extraction
        const webinarData = {
          user_id: user.id,
          workspace_id: workspaceId,
          webinar_id: detailedWebinar.id.toString(),
          webinar_uuid: detailedWebinar.uuid,
          topic: detailedWebinar.topic,
          agenda: detailedWebinar.agenda || '',
          start_time: detailedWebinar.start_time,
          duration: detailedWebinar.duration,
          timezone: detailedWebinar.timezone,
          status: detailedWebinar.status,
          type: detailedWebinar.type,
          host_email: detailedWebinar.host_email,
          raw_data: JSON.stringify(comprehensiveRawData),
          
          // Enhanced fields from WebinarDetails interface
          host_id: detailedWebinar.host_id,
          join_url: detailedWebinar.join_url,
          registration_url: detailedWebinar.registration_url,
          password: detailedWebinar.password,
          start_url: detailedWebinar.start_url,
          webinar_created_at: detailedWebinar.created_at,
          is_simulive: detailedWebinar.is_simulive || false,
          auto_recording_type: detailedWebinar.settings?.auto_recording,
          approval_type: detailedWebinar.settings?.approval_type,
          registration_type: detailedWebinar.settings?.registration_type,
          contact_name: detailedWebinar.settings?.contact_name,
          contact_email: detailedWebinar.settings?.contact_email,
          enforce_login: detailedWebinar.settings?.enforce_login || false,
          on_demand: detailedWebinar.settings?.on_demand || false,
          practice_session: detailedWebinar.settings?.practice_session || false,
          hd_video: detailedWebinar.settings?.hd_video || false,
          host_video: detailedWebinar.settings?.host_video ?? true,
          panelists_video: detailedWebinar.settings?.panelists_video ?? true,
          audio_type: detailedWebinar.settings?.audio || 'both',
          language: detailedWebinar.settings?.language || 'en-US'
        };

        // Upsert webinar data
        const { error: upsertError } = await supabaseAdmin
          .from('zoom_webinars')
          .upsert(webinarData, {
            onConflict: 'user_id,webinar_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('[handleListWebinars] Error upserting webinar:', upsertError);
        } else {
          itemsUpdated++;
          processedWebinars.push(webinarData);
          
          // Process recurrence data if present
          await processRecurrenceData(supabaseAdmin, user.id, workspaceId, detailedWebinar);
          
          // Process tracking fields if present
          await processTrackingFields(supabaseAdmin, user.id, workspaceId, detailedWebinar);
          
          // Process occurrences if present
          await processOccurrences(supabaseAdmin, user.id, workspaceId, detailedWebinar);
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (webinarError) {
        console.error(`[handleListWebinars] Error processing webinar ${webinar.id}:`, webinarError);
      }
    }

    // Record sync history
    await supabaseAdmin
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        sync_type: 'webinars',
        status: 'success',
        items_synced: itemsUpdated,
        message: `Successfully synced ${itemsUpdated} webinars with enhanced data`
      });

    console.log(`[handleListWebinars] Successfully synced ${itemsUpdated} webinars with enhanced data`);

    return new Response(JSON.stringify({
      webinars: processedWebinars,
      syncResults: {
        itemsUpdated,
        totalFetched: webinarsData.webinars?.length || 0,
        enhanced: true
      }
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('[handleListWebinars] Error:', error);
    
    // Record failed sync
    try {
      await supabaseAdmin
        .from('zoom_sync_history')
        .insert({
          user_id: user.id,
          sync_type: 'webinars',
          status: 'error',
          items_synced: 0,
          message: error.message
        });
    } catch (logError) {
      console.error('[handleListWebinars] Error logging failed sync:', logError);
    }

    return new Response(JSON.stringify({
      error: error.message || 'Failed to fetch webinars'
    }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
}

/**
 * Process recurrence data for recurring webinars
 */
async function processRecurrenceData(supabaseAdmin: any, userId: string, workspaceId: string, webinar: any) {
  if (!webinar.recurrence) return;
  
  try {
    const recurrenceData = {
      user_id: userId,
      workspace_id: workspaceId,
      webinar_id: webinar.id.toString(),
      recurrence_type: webinar.recurrence.type,
      repeat_interval: webinar.recurrence.repeat_interval,
      weekly_days: webinar.recurrence.weekly_days,
      monthly_day: webinar.recurrence.monthly_day,
      monthly_week: webinar.recurrence.monthly_week,
      monthly_week_day: webinar.recurrence.monthly_week_day,
      end_times: webinar.recurrence.end_times,
      end_date_time: webinar.recurrence.end_date_time,
      raw_data: JSON.stringify(webinar.recurrence)
    };

    await supabaseAdmin
      .from('zoom_webinar_recurrence')
      .upsert(recurrenceData, {
        onConflict: 'webinar_id',
        ignoreDuplicates: false
      });
      
    console.log(`[processRecurrenceData] Processed recurrence data for webinar ${webinar.id}`);
  } catch (error) {
    console.error('[processRecurrenceData] Error:', error);
  }
}

/**
 * Process tracking fields for webinars
 */
async function processTrackingFields(supabaseAdmin: any, userId: string, workspaceId: string, webinar: any) {
  if (!webinar.tracking_fields || !Array.isArray(webinar.tracking_fields)) return;
  
  try {
    // Clear existing tracking fields for this webinar
    await supabaseAdmin
      .from('zoom_webinar_tracking_fields')
      .delete()
      .eq('user_id', userId)
      .eq('webinar_id', webinar.id.toString());

    // Insert new tracking fields
    for (const field of webinar.tracking_fields) {
      const trackingFieldData = {
        user_id: userId,
        workspace_id: workspaceId,
        webinar_id: webinar.id.toString(),
        field_name: field.field,
        field_value: field.value,
        is_visible: field.visible !== false, // Default to true if not specified
        is_required: field.required || false
      };

      await supabaseAdmin
        .from('zoom_webinar_tracking_fields')
        .insert(trackingFieldData);
    }
    
    console.log(`[processTrackingFields] Processed ${webinar.tracking_fields.length} tracking fields for webinar ${webinar.id}`);
  } catch (error) {
    console.error('[processTrackingFields] Error:', error);
  }
}

/**
 * Process occurrences for recurring webinars
 */
async function processOccurrences(supabaseAdmin: any, userId: string, workspaceId: string, webinar: any) {
  if (!webinar.occurrences || !Array.isArray(webinar.occurrences)) return;
  
  try {
    for (const occurrence of webinar.occurrences) {
      const occurrenceData = {
        user_id: userId,
        workspace_id: workspaceId,
        webinar_id: webinar.id.toString(),
        occurrence_id: occurrence.occurrence_id,
        start_time: occurrence.start_time,
        duration: occurrence.duration,
        status: occurrence.status,
        raw_data: JSON.stringify(occurrence)
      };

      await supabaseAdmin
        .from('zoom_webinar_occurrences')
        .upsert(occurrenceData, {
          onConflict: 'user_id,webinar_id,occurrence_id',
          ignoreDuplicates: false
        });
    }
    
    console.log(`[processOccurrences] Processed ${webinar.occurrences.length} occurrences for webinar ${webinar.id}`);
  } catch (error) {
    console.error('[processOccurrences] Error:', error);
  }
}
