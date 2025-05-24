
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
      .select('webinar_id, status')
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

    // Process webinars in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < webinars.length; i += batchSize) {
      const batch = webinars.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (webinar) => {
        try {
          // Only process ended webinars for participant data
          if (webinar.status !== 'ended') {
            console.log(`[handleUpdateWebinarParticipants] Skipping webinar ${webinar.webinar_id} - status: ${webinar.status}`);
            return;
          }

          // Fetch registrants count
          let registrantsCount = 0;
          try {
            const registrantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar.webinar_id}/registrants?status=approved&page_size=300`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });

            if (registrantsResponse.ok) {
              const registrantsData = await registrantsResponse.json();
              registrantsCount = registrantsData.total_records || 0;
            } else {
              console.log(`[handleUpdateWebinarParticipants] Could not fetch registrants for webinar ${webinar.webinar_id}`);
            }
          } catch (error) {
            console.log(`[handleUpdateWebinarParticipants] Error fetching registrants for ${webinar.webinar_id}:`, error.message);
          }

          // Fetch participants count
          let participantsCount = 0;
          try {
            const participantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar.webinar_id}/participants?page_size=300`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });

            if (participantsResponse.ok) {
              const participantsData = await participantsResponse.json();
              participantsCount = participantsData.total_records || 0;
            } else {
              console.log(`[handleUpdateWebinarParticipants] Could not fetch participants for webinar ${webinar.webinar_id}`);
            }
          } catch (error) {
            console.log(`[handleUpdateWebinarParticipants] Error fetching participants for ${webinar.webinar_id}:`, error.message);
          }

          // Update the webinar record with participant data
          if (registrantsCount > 0 || participantsCount > 0) {
            // Get the current raw_data
            const { data: currentWebinar } = await supabaseAdmin
              .from('zoom_webinars')
              .select('raw_data')
              .eq('webinar_id', webinar.webinar_id)
              .eq('user_id', user.id)
              .single();

            if (currentWebinar) {
              const updatedRawData = {
                ...currentWebinar.raw_data,
                registrants_count: registrantsCount,
                participants_count: participantsCount,
                participant_data_updated_at: new Date().toISOString()
              };

              const { error: updateError } = await supabaseAdmin
                .from('zoom_webinars')
                .update({ 
                  raw_data: updatedRawData,
                  updated_at: new Date().toISOString()
                })
                .eq('webinar_id', webinar.webinar_id)
                .eq('user_id', user.id);

              if (updateError) {
                console.error(`[handleUpdateWebinarParticipants] DB error updating webinar ${webinar.webinar_id}:`, updateError);
              } else {
                updatedCount++;
                console.log(`[handleUpdateWebinarParticipants] Updated webinar ${webinar.webinar_id} - registrants: ${registrantsCount}, participants: ${participantsCount}`);
              }
            }
          }

        } catch (error) {
          console.error(`[handleUpdateWebinarParticipants] Error processing webinar ${webinar.webinar_id}:`, error);
        }
      }));

      // Add a small delay between batches to respect rate limits
      if (i + batchSize < webinars.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[handleUpdateWebinarParticipants] Successfully updated participant data for ${updatedCount} webinars`);

    return new Response(JSON.stringify({ message: 'Participant data updated', updated: updatedCount }), {
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

// Helper function to safely fetch participant data with error handling
async function fetchParticipantData(webinarId: string, accessToken: string): Promise<{ registrants: number; participants: number }> {
  let registrantsCount = 0;
  let participantsCount = 0;

  try {
    // Fetch registrants
    const registrantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/registrants?status=approved&page_size=300`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (registrantsResponse.ok) {
      const registrantsData = await registrantsResponse.json();
      registrantsCount = registrantsData.total_records || 0;
    }
  } catch (error) {
    console.log(`Could not fetch registrants for webinar ${webinarId}:`, error.message);
  }

  try {
    // Fetch participants
    const participantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/participants?page_size=300`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (participantsResponse.ok) {
      const participantsData = await participantsResponse.json();
      participantsCount = participantsData.total_records || 0;
    }
  } catch (error) {
    console.log(`Could not fetch participants for webinar ${webinarId}:`, error.message);
  }

  return { registrants: registrantsCount, participants: participantsCount };
}

// Helper function to process webinars in batches with concurrent API calls
async function processWebinarBatch(
  webinars: any[],
  accessToken: string,
  supabaseAdmin: any,
  userId: string,
  workspaceId: string | null
): Promise<{ processed: any[], errors: string[] }> {
  const processed = [];
  const errors = [];
  
  // Process up to 5 webinars concurrently to avoid overwhelming the API
  const concurrencyLimit = 5;
  const chunks = [];
  
  for (let i = 0; i < webinars.length; i += concurrencyLimit) {
    chunks.push(webinars.slice(i, i + concurrencyLimit));
  }
  
  for (const chunk of chunks) {
    const promises = chunk.map(async (webinar) => {
      try {
        // Fetch detailed webinar information
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
        }

        // Fetch participant data for ended webinars
        let participantData = { registrants: 0, participants: 0 };
        if (detailedWebinar.status === 'ended') {
          participantData = await fetchParticipantData(detailedWebinar.id, accessToken);
        }

        // Create comprehensive raw data
        const comprehensiveRawData = {
          ...detailedWebinar,
          original_list_data: webinar,
          detailed_data: detailedWebinar,
          settings: detailedWebinar.settings || {},
          recurrence: detailedWebinar.recurrence,
          tracking_fields: detailedWebinar.tracking_fields,
          occurrences: detailedWebinar.occurrences,
          registrants_count: participantData.registrants,
          participants_count: participantData.participants,
          fetched_at: new Date().toISOString(),
          api_version: 'v2'
        };

        // Prepare data for database insertion
        const webinarData = {
          user_id: userId,
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

        return { success: true, data: webinarData, detailedWebinar };
      } catch (error) {
        console.error(`Error processing webinar ${webinar.id}:`, error);
        return { success: false, error: error.message, webinarId: webinar.id };
      }
    });

    const results = await Promise.all(promises);
    
    for (const result of results) {
      if (result.success) {
        processed.push(result);
      } else {
        errors.push(`Webinar ${result.webinarId}: ${result.error}`);
      }
    }
    
    // Small delay between chunks to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return { processed, errors };
}

// Helper function to batch upsert webinars to database
async function batchUpsertWebinars(
  webinars: any[],
  supabaseAdmin: any,
  userId: string,
  workspaceId: string | null
): Promise<number> {
  if (webinars.length === 0) return 0;
  
  const batchSize = 10;
  let totalUpserted = 0;
  
  for (let i = 0; i < webinars.length; i += batchSize) {
    const batch = webinars.slice(i, i + batchSize);
    
    try {
      const { error } = await supabaseAdmin
        .from('zoom_webinars')
        .upsert(batch.map(w => w.data), {
          onConflict: 'user_id,webinar_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Batch upsert error:', error);
        // Try individual upserts for this batch
        for (const webinar of batch) {
          try {
            await supabaseAdmin
              .from('zoom_webinars')
              .upsert(webinar.data, {
                onConflict: 'user_id,webinar_id',
                ignoreDuplicates: false
              });
            totalUpserted++;
          } catch (individualError) {
            console.error(`Individual upsert error for webinar ${webinar.data.webinar_id}:`, individualError);
          }
        }
      } else {
        totalUpserted += batch.length;
      }
    } catch (error) {
      console.error('Batch processing error:', error);
    }
  }
  
  return totalUpserted;
}

export async function handleListWebinars(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  forceSync: boolean = false
): Promise<Response> {
  try {
    console.log(`[handleListWebinars] Starting optimized sync for user ${user.id}, forceSync: ${forceSync}`);
    
    // Get workspace for the user
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
    
    // Fetch webinars list from Zoom API (this is quick)
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
    const allWebinars = webinarsData.webinars || [];
    
    console.log(`[handleListWebinars] Fetched ${allWebinars.length} webinars from Zoom API`);

    // Process webinars in batches to avoid timeout
    const batchSize = 15; // Reduced batch size for better performance
    let totalProcessed = 0;
    const allProcessedWebinars = [];
    const allErrors = [];

    // Process in batches
    for (let i = 0; i < allWebinars.length; i += batchSize) {
      const batch = allWebinars.slice(i, i + batchSize);
      console.log(`[handleListWebinars] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allWebinars.length / batchSize)}`);
      
      try {
        const { processed, errors } = await processWebinarBatch(
          batch,
          accessToken,
          supabaseAdmin,
          user.id,
          workspaceId
        );
        
        // Upsert this batch to database
        const upserted = await batchUpsertWebinars(processed, supabaseAdmin, user.id, workspaceId);
        totalProcessed += upserted;
        
        allProcessedWebinars.push(...processed);
        allErrors.push(...errors);
        
        console.log(`[handleListWebinars] Batch ${Math.floor(i / batchSize) + 1} complete: ${upserted} webinars processed`);
        
        // Check if we're approaching timeout (leave 5 seconds buffer)
        const elapsedTime = Date.now() - (req as any).startTime || 0;
        if (elapsedTime > 20000) { // 20 seconds elapsed, return partial results
          console.log(`[handleListWebinars] Approaching timeout, returning partial results`);
          
          // Record partial sync
          await supabaseAdmin
            .from('zoom_sync_history')
            .insert({
              user_id: user.id,
              workspace_id: workspaceId,
              sync_type: 'webinars',
              status: 'partial',
              items_synced: totalProcessed,
              message: `Partial sync completed: ${totalProcessed}/${allWebinars.length} webinars processed`
            });

          return new Response(JSON.stringify({
            webinars: allProcessedWebinars.map(w => w.data),
            syncResults: {
              itemsUpdated: totalProcessed,
              totalFetched: allWebinars.length,
              partial: true,
              errors: allErrors
            }
          }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
          });
        }
        
      } catch (batchError) {
        console.error(`[handleListWebinars] Error processing batch ${Math.floor(i / batchSize) + 1}:`, batchError);
        allErrors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${batchError.message}`);
      }
    }

    // Record successful sync
    await supabaseAdmin
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        sync_type: 'webinars',
        status: 'success',
        items_synced: totalProcessed,
        message: `Successfully synced ${totalProcessed} webinars with enhanced data${allErrors.length > 0 ? ` (${allErrors.length} errors)` : ''}`
      });

    console.log(`[handleListWebinars] Complete sync finished: ${totalProcessed} webinars processed`);

    return new Response(JSON.stringify({
      webinars: allProcessedWebinars.map(w => w.data),
      syncResults: {
        itemsUpdated: totalProcessed,
        totalFetched: allWebinars.length,
        enhanced: true,
        errors: allErrors
      }
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('[handleListWebinars] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to list webinars' }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
}
