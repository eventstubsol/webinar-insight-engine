
// Functions for syncing webinar data to database with enhanced host information
export async function syncWebinarMetadata(
  supabase: any, 
  user: any, 
  webinarData: any, 
  hostEmail: string | null, 
  hostId: string | null,
  hostName?: string | null,
  hostFirstName?: string | null,
  hostLastName?: string | null
) {
  // Extract actual timing data from webinar response
  const actualStartTime = webinarData.actual_start_time || 
                          webinarData.start_time_actual || 
                          webinarData.actualStartTime || 
                          null;
                          
  const actualDuration = webinarData.actual_duration || 
                         webinarData.duration_actual || 
                         webinarData.actualDuration || 
                         null;

  // Ensure host information is preserved in raw_data
  const enhancedRawData = {
    ...webinarData,
    host_info: {
      email: hostEmail,
      display_name: hostName,
      first_name: hostFirstName,
      last_name: hostLastName,
      id: hostId
    }
  };

  const { error: webinarError } = await supabase
    .from('zoom_webinars')
    .upsert({
      user_id: user.id,
      webinar_id: webinarData.id,
      webinar_uuid: webinarData.uuid,
      topic: webinarData.topic,
      start_time: webinarData.start_time,
      duration: webinarData.duration,
      actual_start_time: actualStartTime,
      actual_duration: actualDuration,
      timezone: webinarData.timezone,
      agenda: webinarData.agenda || '',
      host_email: hostEmail || null,
      host_id: hostId || null,
      host_name: hostName || null,
      host_first_name: hostFirstName || null,
      host_last_name: hostLastName || null,
      status: webinarData.status,
      type: webinarData.type,
      raw_data: enhancedRawData,
      last_synced_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,webinar_id'
    });

  return { error: webinarError };
}

export async function syncRegistrants(supabase: any, user: any, token: string, webinarId: string) {
  console.log(`[zoom-api][data-syncer] Fetching registrants for: ${webinarId}`);
  
  const registrantsRes = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/registrants?page_size=300`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!registrantsRes.ok) {
    const errorText = await registrantsRes.text();
    console.log(`[zoom-api][data-syncer] No registrants found or error:`, errorText);
    return { count: 0, error: null };
  }

  const registrantsData = await registrantsRes.json();
  
  if (!registrantsData.registrants || registrantsData.registrants.length === 0) {
    return { count: 0, error: null };
  }

  // Delete existing registrants for this webinar
  await supabase
    .from('zoom_webinar_participants')
    .delete()
    .eq('user_id', user.id)
    .eq('webinar_id', webinarId)
    .eq('participant_type', 'registrant');
  
  // Insert new registrants
  const registrantsToInsert = registrantsData.registrants.map((registrant: any) => ({
    user_id: user.id,
    webinar_id: webinarId,
    participant_type: 'registrant',
    participant_id: registrant.id,
    email: registrant.email,
    name: `${registrant.first_name} ${registrant.last_name}`.trim(),
    join_time: registrant.create_time,
    raw_data: registrant
  }));
  
  const { error: registrantsError } = await supabase
    .from('zoom_webinar_participants')
    .insert(registrantsToInsert);
  
  if (registrantsError) {
    console.error(`[zoom-api][data-syncer] Error inserting registrants:`, registrantsError);
  } else {
    console.log(`[zoom-api][data-syncer] Synced ${registrantsData.registrants.length} registrants for: ${webinarId}`);
  }

  return { 
    count: registrantsError ? 0 : registrantsData.registrants.length, 
    error: registrantsError 
  };
}

export async function syncAttendees(supabase: any, user: any, token: string, webinarId: string) {
  console.log(`[zoom-api][data-syncer] Fetching attendees for: ${webinarId}`);
  
  const attendeesRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/participants?page_size=300`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!attendeesRes.ok) {
    const errorText = await attendeesRes.text();
    console.log(`[zoom-api][data-syncer] No attendees found or error:`, errorText);
    return { count: 0, error: null };
  }

  const attendeesData = await attendeesRes.json();
  
  if (!attendeesData.participants || attendeesData.participants.length === 0) {
    return { count: 0, error: null };
  }

  // Delete existing attendees for this webinar
  await supabase
    .from('zoom_webinar_participants')
    .delete()
    .eq('user_id', user.id)
    .eq('webinar_id', webinarId)
    .eq('participant_type', 'attendee');
  
  // Insert new attendees
  const attendeesToInsert = attendeesData.participants.map((attendee: any) => ({
    user_id: user.id,
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
  
  const { error: attendeesError } = await supabase
    .from('zoom_webinar_participants')
    .insert(attendeesToInsert);
  
  if (attendeesError) {
    console.error(`[zoom-api][data-syncer] Error inserting attendees:`, attendeesError);
  } else {
    console.log(`[zoom-api][data-syncer] Synced ${attendeesData.participants.length} attendees for: ${webinarId}`);
  }

  return { 
    count: attendeesError ? 0 : attendeesData.participants.length, 
    error: attendeesError 
  };
}

export async function syncWebinarInstances(supabase: any, user: any, token: string, webinarId: string) {
  console.log(`[zoom-api][data-syncer] Fetching past webinar details for: ${webinarId}`);
  
  // Use the past webinar endpoint to get actual timing details
  const pastWebinarRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!pastWebinarRes.ok) {
    const errorText = await pastWebinarRes.text();
    console.log(`[zoom-api][data-syncer] No past webinar details found or error:`, errorText);
    return { count: 0, errors: [] };
  }

  const pastWebinarData = await pastWebinarRes.json();
  
  if (!pastWebinarData || !pastWebinarData.uuid) {
    console.log(`[zoom-api][data-syncer] Invalid past webinar data for: ${webinarId}`);
    return { count: 0, errors: [] };
  }

  // Create instance record with actual timing data
  const instanceData = {
    user_id: user.id,
    webinar_id: webinarId,
    webinar_uuid: pastWebinarData.uuid,
    instance_id: pastWebinarData.uuid,
    topic: pastWebinarData.topic,
    start_time: pastWebinarData.start_time,
    end_time: pastWebinarData.end_time,
    duration: pastWebinarData.duration,
    status: 'ended',
    participants_count: pastWebinarData.total_minutes || 0,
    registrants_count: 0, // Will be updated by other sync functions
    raw_data: pastWebinarData
  };

  const { error: instanceError } = await supabase
    .from('zoom_webinar_instances')
    .upsert(instanceData, {
      onConflict: 'user_id,webinar_id,instance_id'
    });
  
  if (instanceError) {
    console.error(`[zoom-api][data-syncer] Error inserting instance:`, instanceError);
    return { count: 0, errors: [instanceError.message] };
  } else {
    console.log(`[zoom-api][data-syncer] Synced past webinar instance for: ${webinarId} with actual timing`);
    return { count: 1, errors: [] };
  }
}
