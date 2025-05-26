
// Functions for syncing webinar participants (registrants and attendees)

export async function syncRegistrants(supabase: any, user: any, token: string, webinarId: string) {
  console.log(`[zoom-api][participant-syncer] Fetching registrants for: ${webinarId}`);
  
  const registrantsRes = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/registrants?page_size=300`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!registrantsRes.ok) {
    const errorText = await registrantsRes.text();
    console.log(`[zoom-api][participant-syncer] No registrants found or error:`, errorText);
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
  
  // Insert new registrants with proper handling for the new unique constraint
  const registrantsToInsert = registrantsData.registrants.map((registrant: any) => ({
    user_id: user.id,
    webinar_id: webinarId,
    participant_type: 'registrant',
    participant_id: registrant.id || `reg_${registrant.email}_${Date.now()}`, // Ensure participant_id is never null
    email: registrant.email,
    name: `${registrant.first_name} ${registrant.last_name}`.trim(),
    join_time: registrant.create_time,
    raw_data: registrant
  }));
  
  const { error: registrantsError } = await supabase
    .from('zoom_webinar_participants')
    .upsert(registrantsToInsert, {
      onConflict: 'user_id,webinar_id,participant_type,participant_id',
      ignoreDuplicates: false
    });
  
  if (registrantsError) {
    console.error(`[zoom-api][participant-syncer] Error inserting registrants:`, registrantsError);
  } else {
    console.log(`[zoom-api][participant-syncer] Synced ${registrantsData.registrants.length} registrants for: ${webinarId}`);
  }

  return { 
    count: registrantsError ? 0 : registrantsData.registrants.length, 
    error: registrantsError 
  };
}

export async function syncAttendees(supabase: any, user: any, token: string, webinarId: string) {
  console.log(`[zoom-api][participant-syncer] Fetching attendees for: ${webinarId}`);
  
  const attendeesRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/participants?page_size=300`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!attendeesRes.ok) {
    const errorText = await attendeesRes.text();
    console.log(`[zoom-api][participant-syncer] No attendees found or error:`, errorText);
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
  
  // Insert new attendees with proper handling for the new unique constraint
  const attendeesToInsert = attendeesData.participants.map((attendee: any) => ({
    user_id: user.id,
    webinar_id: webinarId,
    participant_type: 'attendee',
    participant_id: attendee.id || `att_${attendee.user_email}_${Date.now()}`, // Ensure participant_id is never null
    email: attendee.user_email,
    name: attendee.name,
    join_time: attendee.join_time,
    leave_time: attendee.leave_time,
    duration: attendee.duration,
    raw_data: attendee
  }));
  
  const { error: attendeesError } = await supabase
    .from('zoom_webinar_participants')
    .upsert(attendeesToInsert, {
      onConflict: 'user_id,webinar_id,participant_type,participant_id',
      ignoreDuplicates: false
    });
  
  if (attendeesError) {
    console.error(`[zoom-api][participant-syncer] Error inserting attendees:`, attendeesError);
  } else {
    console.log(`[zoom-api][participant-syncer] Synced ${attendeesData.participants.length} attendees for: ${webinarId}`);
  }

  return { 
    count: attendeesError ? 0 : attendeesData.participants.length, 
    error: attendeesError 
  };
}
