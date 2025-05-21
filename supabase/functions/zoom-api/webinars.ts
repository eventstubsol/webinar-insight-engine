
import { corsHeaders } from './cors.ts';
import { getZoomJwtToken } from './auth.ts';

// Handle listing webinars
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[zoom-api][list-webinars] Starting action for user: ${user.id}, force_sync: ${force_sync}`);
  
  try {
    // If not forcing sync, first try to get webinars from database
    if (!force_sync) {
      console.log('[zoom-api][list-webinars] Checking database first for webinars');
      const { data: dbWebinars, error: dbError } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });
        
      // If we have webinars in the database and not forcing a refresh, return them
      if (!dbError && dbWebinars && dbWebinars.length > 0) {
        console.log(`[zoom-api][list-webinars] Found ${dbWebinars.length} webinars in database, returning cached data`);
        return new Response(JSON.stringify({ 
          webinars: dbWebinars.map(w => ({
            id: w.webinar_id,
            uuid: w.webinar_uuid,
            topic: w.topic,
            start_time: w.start_time,
            duration: w.duration,
            timezone: w.timezone,
            agenda: w.agenda || '',
            host_email: w.host_email,
            status: w.status,
            type: w.type,
            ...w.raw_data
          })),
          source: 'database',
          syncResults: {
            itemsFetched: dbWebinars.length, 
            itemsUpdated: 0
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        console.log('[zoom-api][list-webinars] No webinars found in database or forcing refresh');
      }
    } else {
      console.log('[zoom-api][list-webinars] Force sync requested, bypassing database cache');
    }
    
    // Get token and fetch from Zoom API
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    console.log('[zoom-api][list-webinars] Got Zoom token, fetching webinars directly from Zoom');
    
    // First try to get the user's email
    const meResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!meResponse.ok) {
      const meData = await meResponse.json();
      console.error('[zoom-api][list-webinars] Failed to get user info:', meData);
      
      // Handle missing OAuth scopes error specifically
      if (meData.code === 4711 || meData.message?.includes('scopes')) {
        throw new Error('Missing required OAuth scopes in your Zoom App. Please add these scopes to your Zoom Server-to-Server OAuth app: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin');
      }
      
      // Handle other API error codes
      if (meData.code === 124) {
        throw new Error('Invalid Zoom access token. Please check your credentials.');
      } else if (meData.code === 1001) {
        throw new Error('User not found or does not exist in this account.');
      } else {
        throw new Error(`Failed to get user info: ${meData.message || 'Unknown error'}`);
      }
    }
    
    const meData = await meResponse.json();
    console.log(`[zoom-api][list-webinars] Got user info for: ${meData.email}`);

    // Now fetch the webinars
    const response = await fetch(`https://api.zoom.us/v2/users/${meData.id}/webinars?page_size=300`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('[zoom-api][list-webinars] Zoom webinars error:', responseData);
      
      if (responseData.code === 4700) {
        throw new Error('Webinar capabilities not enabled for this Zoom account. This feature requires a Zoom paid plan with webinar add-on.');
      } else if (responseData.code === 4711 || responseData.message?.includes('scopes')) {
        throw new Error('Missing required OAuth webinar scopes. Please add webinar:read:webinar:admin to your Zoom app.');
      } else {
        throw new Error(`Failed to fetch webinars: ${responseData.message || 'Unknown error'} (Code: ${responseData.code || 'Unknown'})`);
      }
    }
    
    console.log(`[zoom-api][list-webinars] Successfully fetched ${responseData.webinars?.length || 0} webinars from Zoom API`);
    
    let itemsUpdated = 0;
    let existingWebinars = [];
    
    // If there are webinars, compare with existing data to detect changes
    if (responseData.webinars && responseData.webinars.length > 0) {
      // Get existing webinars for comparison
      const { data: existingData } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id);
        
      existingWebinars = existingData || [];
      
      // For each webinar, get participant counts for completed webinars
      const webinarsWithParticipantData = await Promise.all(
        responseData.webinars.map(async (webinar: any) => {
          // Only fetch participant data for completed webinars
          const webinarStartTime = new Date(webinar.start_time);
          const isCompleted = webinar.status === 'ended' || 
                             (webinarStartTime < new Date() && 
                              new Date().getTime() - webinarStartTime.getTime() > webinar.duration * 60 * 1000);
          
          if (isCompleted) {
            try {
              console.log(`[zoom-api][list-webinars] Fetching participants for webinar: ${webinar.id}`);
              
              // Make parallel requests for registrants and attendees
              const [registrantsRes, attendeesRes] = await Promise.all([
                fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/registrants?page_size=1`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }),
                fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}/participants?page_size=1`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                })
              ]);
              
              const [registrantsData, attendeesData] = await Promise.all([
                registrantsRes.ok ? registrantsRes.json() : { total_records: 0 },
                attendeesRes.ok ? attendeesRes.json() : { total_records: 0 }
              ]);
              
              // Enhance webinar object with participant counts
              return {
                ...webinar,
                registrants_count: registrantsData.total_records || 0,
                participants_count: attendeesData.total_records || 0
              };
            } catch (err) {
              console.error(`[zoom-api][list-webinars] Error fetching participants for webinar ${webinar.id}:`, err);
              // Continue with the original webinar data if there's an error
              return webinar;
            }
          } else {
            // Return original webinar data for upcoming webinars
            return webinar;
          }
        })
      );
      
      // Update the responseData with enhanced webinars
      responseData.webinars = webinarsWithParticipantData;
      
      // Compare and detect changes
      for (const webinar of responseData.webinars) {
        const existing = existingWebinars.find(w => w.webinar_id === webinar.id.toString());
        
        if (!existing || 
            existing.topic !== webinar.topic ||
            existing.start_time !== webinar.start_time ||
            existing.duration !== webinar.duration ||
            existing.agenda !== webinar.agenda ||
            existing.status !== webinar.status ||
            JSON.stringify(existing.raw_data) !== JSON.stringify(webinar)) {
          itemsUpdated++;
        }
      }
      
      console.log(`[zoom-api][list-webinars] Detected ${itemsUpdated} webinars with changes out of ${responseData.webinars.length} total`);
      
      // If changes detected or force sync, update the database
      if (itemsUpdated > 0 || force_sync) {
        // First delete existing webinars for this user
        const { error: deleteError } = await supabase
          .from('zoom_webinars')
          .delete()
          .eq('user_id', user.id);
        
        if (deleteError) {
          console.error('[zoom-api][list-webinars] Error deleting existing webinars:', deleteError);
        }
        
        // Insert new webinars
        const webinarsToInsert = responseData.webinars.map((webinar: any) => ({
          user_id: user.id,
          webinar_id: webinar.id,
          webinar_uuid: webinar.uuid,
          topic: webinar.topic,
          start_time: webinar.start_time,
          duration: webinar.duration,
          timezone: webinar.timezone,
          agenda: webinar.agenda || '',
          host_email: webinar.host_email,
          status: webinar.status,
          type: webinar.type,
          raw_data: webinar
        }));
        
        const { error: insertError } = await supabase
          .from('zoom_webinars')
          .insert(webinarsToInsert);
        
        if (insertError) {
          console.error('[zoom-api][list-webinars] Error inserting webinars:', insertError);
        }
        
        // Record sync in history
        await supabase
          .from('zoom_sync_history')
          .insert({
            user_id: user.id,
            sync_type: 'webinars',
            status: 'success',
            items_synced: webinarsToInsert.length,
            message: `Successfully synced ${webinarsToInsert.length} webinars with ${itemsUpdated} changes detected`
          });
          
        console.log(`[zoom-api][list-webinars] Database updated with ${webinarsToInsert.length} webinars`);
      } else {
        // Record sync but note no changes
        await supabase
          .from('zoom_sync_history')
          .insert({
            user_id: user.id,
            sync_type: 'webinars',
            status: 'success',
            items_synced: 0,
            message: `No changes detected in ${responseData.webinars.length} webinars`
          });
          
        console.log('[zoom-api][list-webinars] No changes detected, database not updated');
      }
    } else {
      // Record empty sync in history
      await supabase
        .from('zoom_sync_history')
        .insert({
          user_id: user.id,
          sync_type: 'webinars',
          status: 'success',
          items_synced: 0,
          message: 'No webinars found to sync'
        });
        
      console.log('[zoom-api][list-webinars] No webinars found in Zoom account');
    }
    
    return new Response(JSON.stringify({ 
      webinars: responseData.webinars || [],
      source: 'api',
      syncResults: {
        itemsFetched: responseData.webinars?.length || 0,
        itemsUpdated: itemsUpdated
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[zoom-api][list-webinars] Error in action:', error);
    
    // Record failed sync in history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'webinars',
        status: 'error',
        items_synced: 0,
        message: error.message || 'Unknown error'
      });
    
    throw error; // Let the main error handler format the response
  }
}

// Handle getting webinar by id
export async function handleGetWebinar(req: Request, supabase: any, user: any, credentials: any, id: string) {
  if (!id) {
    throw new Error('Webinar ID is required');
  }
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  const response = await fetch(`https://api.zoom.us/v2/webinars/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('Zoom webinar details error:', data);
    throw new Error(`Failed to fetch webinar details: ${data.message || 'Unknown error'}`);
  }

  return new Response(JSON.stringify({ webinar: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handle getting participants for a webinar
export async function handleGetParticipants(req: Request, supabase: any, user: any, credentials: any, id: string) {
  if (!id) {
    throw new Error('Webinar ID is required');
  }
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  const [registrantsRes, attendeesRes] = await Promise.all([
    fetch(`https://api.zoom.us/v2/webinars/${id}/registrants?page_size=300`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }),
    fetch(`https://api.zoom.us/v2/past_webinars/${id}/participants?page_size=300`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
  ]);
  
  const [registrantsData, attendeesData] = await Promise.all([
    registrantsRes.json(),
    attendeesRes.json()
  ]);
  
  // Store participants in database
  if (registrantsRes.ok && registrantsData.registrants && registrantsData.registrants.length > 0) {
    // Delete existing registrants for this webinar
    await supabase
      .from('zoom_webinar_participants')
      .delete()
      .eq('user_id', user.id)
      .eq('webinar_id', id)
      .eq('participant_type', 'registrant');
    
    // Insert new registrants
    const registrantsToInsert = registrantsData.registrants.map((registrant: any) => ({
      user_id: user.id,
      webinar_id: id,
      participant_type: 'registrant',
      participant_id: registrant.id,
      email: registrant.email,
      name: `${registrant.first_name} ${registrant.last_name}`.trim(),
      join_time: registrant.create_time,
      raw_data: registrant
    }));
    
    await supabase
      .from('zoom_webinar_participants')
      .insert(registrantsToInsert);
  }
  
  if (attendeesRes.ok && attendeesData.participants && attendeesData.participants.length > 0) {
    // Delete existing attendees for this webinar
    await supabase
      .from('zoom_webinar_participants')
      .delete()
      .eq('user_id', user.id)
      .eq('webinar_id', id)
      .eq('participant_type', 'attendee');
    
    // Insert new attendees
    const attendeesToInsert = attendeesData.participants.map((attendee: any) => ({
      user_id: user.id,
      webinar_id: id,
      participant_type: 'attendee',
      participant_id: attendee.id,
      email: attendee.user_email,
      name: attendee.name,
      join_time: attendee.join_time,
      leave_time: attendee.leave_time,
      duration: attendee.duration,
      raw_data: attendee
    }));
    
    await supabase
      .from('zoom_webinar_participants')
      .insert(attendeesToInsert);
  }
  
  // Record sync in history
  await supabase
    .from('zoom_sync_history')
    .insert({
      user_id: user.id,
      sync_type: 'participants',
      status: 'success',
      items_synced: (registrantsData.registrants?.length || 0) + (attendeesData.participants?.length || 0),
      message: `Synced ${registrantsData.registrants?.length || 0} registrants and ${attendeesData.participants?.length || 0} attendees`
    });
  
  return new Response(JSON.stringify({
    registrants: registrantsRes.ok ? registrantsData.registrants || [] : [],
    attendees: attendeesRes.ok ? attendeesData.participants || [] : []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handle getting instances of a webinar
export async function handleGetWebinarInstances(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  if (!webinarId) {
    throw new Error('Webinar ID is required');
  }
  
  console.log(`[zoom-api][get-webinar-instances] Fetching instances for webinar ID: ${webinarId}`);
  
  try {
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Get webinar instances from Zoom API
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[zoom-api][get-webinar-instances] API error:', errorData);
      
      if (errorData.code === 3001) {
        // This is a normal error for webinars without multiple instances
        console.log('[zoom-api][get-webinar-instances] Webinar has no instances or is not recurring');
        return new Response(JSON.stringify({ instances: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`Failed to fetch webinar instances: ${errorData.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    console.log(`[zoom-api][get-webinar-instances] Found ${data.instances?.length || 0} instances`);
    
    // Store instances in database
    if (data.instances && data.instances.length > 0) {
      // First, get the webinar details to associate with each instance
      const webinarResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!webinarResponse.ok) {
        console.warn(`[zoom-api][get-webinar-instances] Could not fetch webinar details for ${webinarId}`);
      }
      
      const webinarData = webinarResponse.ok ? await webinarResponse.json() : null;
      
      for (const instance of data.instances) {
        // For each instance, we need more detailed information like actual participants
        // We'll use the past_webinar endpoint with the specific instance UUID
        let instanceDetails = { ...instance };
        
        // Only try to get past webinar details if the instance has a uuid
        if (instance.uuid) {
          try {
            const pastWebinarResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${instance.uuid}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (pastWebinarResponse.ok) {
              const pastWebinarData = await pastWebinarResponse.json();
              instanceDetails = { ...instanceDetails, ...pastWebinarData };
            }
          } catch (pastWebinarError) {
            console.warn(`[zoom-api][get-webinar-instances] Error fetching past webinar details for instance ${instance.uuid}:`, pastWebinarError);
          }
        }
        
        // Get participant & registrant counts for this instance
        let registrantsCount = 0;
        let participantsCount = 0;
        
        try {
          // Only try to get registrants if the instance has an ID
          if (instance.uuid) {
            const registrantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/registrants?page_size=1&occurrence_id=${instance.uuid}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (registrantsResponse.ok) {
              const registrantsData = await registrantsResponse.json();
              registrantsCount = registrantsData.total_records || 0;
            }
          }
          
          // Only try to get participants if the instance has a UUID
          if (instance.uuid) {
            const participantsResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${instance.uuid}/participants?page_size=1`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (participantsResponse.ok) {
              const participantsData = await participantsResponse.json();
              participantsCount = participantsData.total_records || 0;
            }
          }
        } catch (countError) {
          console.warn(`[zoom-api][get-webinar-instances] Error fetching counts for instance ${instance.uuid}:`, countError);
        }
        
        // Prepare the instance data for database insertion
        const instanceToInsert = {
          user_id: user.id,
          webinar_id: webinarId,
          webinar_uuid: webinarData?.uuid || '',
          instance_id: instance.uuid || '',
          start_time: instance.start_time || null,
          end_time: instanceDetails.end_time || null,
          duration: webinarData?.duration || instanceDetails.duration || null,
          topic: webinarData?.topic || instanceDetails.topic || 'Untitled Webinar',
          status: instance.status || null,
          registrants_count: registrantsCount,
          participants_count: participantsCount,
          raw_data: instanceDetails
        };
        
        // Check if this instance already exists
        const { data: existingInstance } = await supabase
          .from('zoom_webinar_instances')
          .select('id')
          .eq('webinar_id', webinarId)
          .eq('instance_id', instance.uuid || '')
          .maybeSingle();
        
        if (existingInstance) {
          // Update existing instance
          await supabase
            .from('zoom_webinar_instances')
            .update(instanceToInsert)
            .eq('id', existingInstance.id);
        } else {
          // Insert new instance
          await supabase
            .from('zoom_webinar_instances')
            .insert(instanceToInsert);
        }
      }
      
      // Record sync in history
      await supabase
        .from('zoom_sync_history')
        .insert({
          user_id: user.id,
          sync_type: 'webinar_instances',
          status: 'success',
          items_synced: data.instances.length,
          message: `Synced ${data.instances.length} instances for webinar ${webinarId}`
        });
    }
    
    return new Response(JSON.stringify({ instances: data.instances || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[zoom-api][get-webinar-instances] Error:', error);
    
    // Record failed sync in history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'webinar_instances',
        status: 'error',
        items_synced: 0,
        message: error.message || 'Unknown error'
      });
    
    throw error;
  }
}

// Handle getting participants for a specific instance
export async function handleGetInstanceParticipants(req: Request, supabase: any, user: any, credentials: any, webinarId: string, instanceId: string) {
  if (!webinarId) {
    throw new Error('Webinar ID is required');
  }
  
  if (!instanceId) {
    throw new Error('Instance ID is required');
  }
  
  console.log(`[zoom-api][get-instance-participants] Fetching participants for webinar ID: ${webinarId}, instance ID: ${instanceId}`);
  
  try {
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Get the database ID for this instance
    const { data: dbInstance, error: dbInstanceError } = await supabase
      .from('zoom_webinar_instances')
      .select('id')
      .eq('webinar_id', webinarId)
      .eq('instance_id', instanceId)
      .maybeSingle();
    
    if (dbInstanceError || !dbInstance) {
      throw new Error(`Instance not found in database: ${dbInstanceError?.message || 'Unknown error'}`);
    }
    
    // Make API requests for registrants and attendees
    const [registrantsRes, attendeesRes] = await Promise.all([
      fetch(`https://api.zoom.us/v2/webinars/${webinarId}/registrants?occurrence_id=${instanceId}&page_size=300`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`https://api.zoom.us/v2/past_webinars/${instanceId}/participants?page_size=300`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    ]);
    
    const [registrantsData, attendeesData] = await Promise.all([
      registrantsRes.json(),
      attendeesRes.json()
    ]);
    
    // Store participants in database
    if (registrantsRes.ok && registrantsData.registrants && registrantsData.registrants.length > 0) {
      // Delete existing registrants for this instance
      await supabase
        .from('zoom_webinar_instance_participants')
        .delete()
        .eq('user_id', user.id)
        .eq('instance_id', dbInstance.id)
        .eq('participant_type', 'registrant');
      
      // Insert new registrants
      const registrantsToInsert = registrantsData.registrants.map((registrant: any) => ({
        user_id: user.id,
        instance_id: dbInstance.id,
        webinar_id: webinarId,
        participant_type: 'registrant',
        participant_id: registrant.id,
        email: registrant.email,
        name: `${registrant.first_name} ${registrant.last_name}`.trim(),
        join_time: registrant.create_time,
        raw_data: registrant
      }));
      
      await supabase
        .from('zoom_webinar_instance_participants')
        .insert(registrantsToInsert);
    }
    
    if (attendeesRes.ok && attendeesData.participants && attendeesData.participants.length > 0) {
      // Delete existing attendees for this instance
      await supabase
        .from('zoom_webinar_instance_participants')
        .delete()
        .eq('user_id', user.id)
        .eq('instance_id', dbInstance.id)
        .eq('participant_type', 'attendee');
      
      // Insert new attendees
      const attendeesToInsert = attendeesData.participants.map((attendee: any) => ({
        user_id: user.id,
        instance_id: dbInstance.id,
        webinar_id: webinarId,
        participant_type: 'attendee',
        participant_id: attendee.id,
        email: attendee.user_email,
        name: attendee.name,
        join_time: attendee.join_time,
        leave_time: attendee.leave_time,
        duration: attendee.duration,
        raw_data: attendee
      }));
      
      await supabase
        .from('zoom_webinar_instance_participants')
        .insert(attendeesToInsert);
    }
    
    // Record sync in history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'instance_participants',
        status: 'success',
        items_synced: (registrantsData.registrants?.length || 0) + (attendeesData.participants?.length || 0),
        message: `Synced ${registrantsData.registrants?.length || 0} registrants and ${attendeesData.participants?.length || 0} attendees for instance ${instanceId}`
      });
    
    return new Response(JSON.stringify({
      registrants: registrantsRes.ok ? registrantsData.registrants || [] : [],
      attendees: attendeesRes.ok ? attendeesData.participants || [] : []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[zoom-api][get-instance-participants] Error:', error);
    
    // Record failed sync in history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'instance_participants',
        status: 'error',
        items_synced: 0,
        message: error.message || 'Unknown error'
      });
    
    throw error;
  }
}

// Updated function to update participant counts for all webinars
export async function handleUpdateWebinarParticipants(req: Request, supabase: any, user: any, credentials: any) {
  console.log(`[zoom-api][update-participants] Starting action for user: ${user.id}`);
  
  try {
    // Get the webinar ID from request body (if provided)
    let body;
    try {
      body = await req.json();
    } catch (e) {
      // If no body, just continue with all webinars
      body = {};
    }
    
    const specificWebinarId = body.webinar_id;
    const userId = body.user_id || user.id;
    
    // Get token for API calls
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Get webinars from database - UPDATED QUERY to include more past webinars
    const { data: webinars, error: webinarsError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });
      
    if (webinarsError || !webinars || webinars.length === 0) {
      console.log('[zoom-api][update-participants] No webinars found in database');
      return new Response(JSON.stringify({ 
        message: 'No webinars found to update', 
        updated: 0,
        skipped: 0,
        errors: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Filter to get completed webinars using time-based logic
    const now = new Date();
    const completedWebinars = webinars.filter(webinar => {
      // Check explicitly for "ended" status or use time-based logic
      if (webinar.status === 'ended') {
        return true;
      }
      
      // Time-based logic: Check if webinar has already passed (start_time + duration)
      const startTime = new Date(webinar.start_time);
      const durationMs = (webinar.duration || 0) * 60 * 1000; // convert minutes to ms
      const endTime = new Date(startTime.getTime() + durationMs);
      
      return endTime < now; // Webinar has ended if end time is in the past
    });
    
    console.log(`[zoom-api][update-participants] Found ${completedWebinars.length} completed webinars out of ${webinars.length} total`);
      
    // Filter by specific webinar ID if provided
    const webinarsToProcess = specificWebinarId 
      ? completedWebinars.filter(w => w.webinar_id === specificWebinarId) 
      : completedWebinars;
      
    console.log(`[zoom-api][update-participants] Processing ${webinarsToProcess.length} webinars`);
    
    // NEW: Process webinars in smaller batches to avoid timeouts
    const BATCH_SIZE = 5;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches
    for (let i = 0; i < webinarsToProcess.length; i += BATCH_SIZE) {
      const batch = webinarsToProcess.slice(i, i + BATCH_SIZE);
      console.log(`[zoom-api][update-participants] Processing batch ${i/BATCH_SIZE + 1} of ${Math.ceil(webinarsToProcess.length/BATCH_SIZE)}, size: ${batch.length}`);
      
      // Process each webinar in the batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async (webinar) => {
          try {
            // Make parallel requests for registrants and attendees
            const [registrantsRes, attendeesRes] = await Promise.all([
              fetch(`https://api.zoom.us/v2/webinars/${webinar.webinar_id}/registrants?page_size=1`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }),
              fetch(`https://api.zoom.us/v2/past_webinars/${webinar.webinar_id}/participants?page_size=1`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              })
            ]);
            
            const [registrantsData, attendeesData] = await Promise.all([
              registrantsRes.ok ? registrantsRes.json() : { total_records: 0 },
              attendeesRes.ok ? attendeesRes.json() : { total_records: 0 }
            ]);
            
            // Update raw_data with participant counts and ensure status is set to "ended" for past webinars
            const updatedRawData = {
              ...webinar.raw_data,
              registrants_count: registrantsData.total_records || 0,
              participants_count: attendeesData.total_records || 0
            };
            
            // Update both the raw_data and set status to "ended" for past webinars
            const { error: updateError } = await supabase
              .from('zoom_webinars')
              .update({
                raw_data: updatedRawData,
                status: 'ended' // Explicitly set status to ended for past webinars
              })
              .eq('id', webinar.id);
            
            if (updateError) {
              console.error(`[zoom-api][update-participants] Error updating webinar ${webinar.webinar_id}:`, updateError);
              return { result: 'error' };
            } else {
              console.log(`[zoom-api][update-participants] Updated webinar ${webinar.webinar_id} with registrants: ${updatedRawData.registrants_count}, participants: ${updatedRawData.participants_count}`);
              return { result: 'updated' };
            }
          } catch (err) {
            console.error(`[zoom-api][update-participants] Error processing webinar ${webinar.webinar_id}:`, err);
            return { result: 'error' };
          }
        })
      );
      
      // Count the results
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          if (result.value.result === 'updated') updated++;
          else if (result.value.result === 'error') errors++;
        } else {
          errors++;
        }
      });
      
      // Add a small delay between batches to prevent rate limiting
      if (i + BATCH_SIZE < webinarsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Record action in sync history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: userId,
        sync_type: 'participants_count',
        status: errors === 0 ? 'success' : 'partial',
        items_synced: updated,
        message: `Updated participant counts for ${updated} webinars, skipped ${skipped}, with ${errors} errors`
      });
    
    return new Response(JSON.stringify({ 
      message: `Updated participant counts for ${updated} webinars, skipped ${skipped}, with ${errors} errors`,
      updated,
      skipped,
      errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[zoom-api][update-participants] Error:', error);
    
    // Record failed sync in history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'participants_count',
        status: 'error',
        items_synced: 0,
        message: error.message || 'Unknown error'
      });
    
    throw error;
  }
}
