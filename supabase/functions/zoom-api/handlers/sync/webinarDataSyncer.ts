// Functions for syncing webinar data to database with enhanced logging for actual timing data
export async function syncWebinarMetadata(
  supabase: any, 
  user: any, 
  webinarData: any, 
  hostEmail?: string,
  hostId?: string,
  hostName?: string,
  hostFirstName?: string,
  hostLastName?: string
) {
  console.log(`[DB-SYNC] 💾 === DATABASE SYNC START ===`);
  console.log(`[DB-SYNC] Syncing webinar metadata for: ${webinarData.id}`);
  console.log(`[DB-SYNC] User ID: ${user.id}`);
  
  try {
    // Log the actual timing data we're about to upsert with enhanced detail
    console.log(`[DB-SYNC] 📊 Input timing data validation:`);
    console.log(`[DB-SYNC] - webinarData.actual_start_time: ${webinarData.actual_start_time} (type: ${typeof webinarData.actual_start_time})`);
    console.log(`[DB-SYNC] - webinarData.actual_duration: ${webinarData.actual_duration} (type: ${typeof webinarData.actual_duration})`);
    console.log(`[DB-SYNC] - webinarData.actual_end_time: ${webinarData.actual_end_time} (type: ${typeof webinarData.actual_end_time})`);
    
    // Prepare webinar data with enhanced host information and actual timing data
    const webinarRecord = {
      user_id: user.id,
      webinar_id: webinarData.id?.toString(),
      webinar_uuid: webinarData.uuid || webinarData.webinar_uuid,
      topic: webinarData.topic,
      type: webinarData.type,
      status: webinarData.status,
      start_time: webinarData.start_time ? new Date(webinarData.start_time).toISOString() : null,
      duration: webinarData.duration || null,
      timezone: webinarData.timezone,
      agenda: webinarData.agenda || null,
      webinar_created_at: webinarData.created_at ? new Date(webinarData.created_at).toISOString() : null,
      join_url: webinarData.join_url,
      start_url: webinarData.start_url || null,
      registration_url: webinarData.registration_url || null,
      password: webinarData.password || null,
      host_id: hostId || webinarData.host_id,
      host_email: hostEmail || webinarData.host_email,
      host_name: hostName || webinarData.host_name,
      host_first_name: hostFirstName || webinarData.host_first_name,
      host_last_name: hostLastName || webinarData.host_last_name,
      // ENHANCED: Include actual timing fields with detailed logging
      actual_start_time: webinarData.actual_start_time ? new Date(webinarData.actual_start_time).toISOString() : null,
      actual_duration: webinarData.actual_duration || null,
      // Other fields
      approval_type: webinarData.settings?.approval_type || webinarData.approval_type,
      registration_type: webinarData.settings?.registration_type || webinarData.registration_type,
      enforce_login: webinarData.settings?.enforce_login || false,
      on_demand: webinarData.settings?.on_demand || false,
      practice_session: webinarData.settings?.practice_session || false,
      hd_video: webinarData.settings?.hd_video || false,
      host_video: webinarData.settings?.host_video || true,
      panelists_video: webinarData.settings?.panelists_video || true,
      is_simulive: webinarData.settings?.is_simulive || false,
      auto_recording_type: webinarData.settings?.auto_recording || null,
      contact_name: webinarData.settings?.contact_name || null,
      contact_email: webinarData.settings?.contact_email || null,
      language: webinarData.settings?.language || 'en-US',
      audio_type: webinarData.settings?.audio || 'both',
      last_synced_at: new Date().toISOString(),
      raw_data: webinarData
    };
    
    console.log(`[DB-SYNC] 🎯 Prepared database record timing fields:`);
    console.log(`[DB-SYNC] - actual_start_time: ${webinarRecord.actual_start_time} (type: ${typeof webinarRecord.actual_start_time})`);
    console.log(`[DB-SYNC] - actual_duration: ${webinarRecord.actual_duration} (type: ${typeof webinarRecord.actual_duration})`);
    console.log(`[DB-SYNC] - webinar_uuid: ${webinarRecord.webinar_uuid}`);
    console.log(`[DB-SYNC] - status: ${webinarRecord.status}`);
    
    console.log(`[DB-SYNC] 🚀 Executing upsert to zoom_webinars table...`);
    
    const { data: upsertData, error } = await supabase
      .from('zoom_webinars')
      .upsert(webinarRecord, {
        onConflict: 'user_id,webinar_id',
        ignoreDuplicates: false
      })
      .select('actual_start_time, actual_duration, webinar_id, last_synced_at');
    
    if (error) {
      console.error(`[DB-SYNC] ❌ UPSERT ERROR:`, error);
      console.error(`[DB-SYNC] Error code: ${error.code}`);
      console.error(`[DB-SYNC] Error message: ${error.message}`);
      console.error(`[DB-SYNC] Error details:`, JSON.stringify(error, null, 2));
      return { error, count: 0 };
    }
    
    console.log(`[DB-SYNC] ✅ UPSERT SUCCESS!`);
    console.log(`[DB-SYNC] Upsert returned data:`, upsertData);
    
    // Enhanced verification query with more fields
    console.log(`[DB-SYNC] 🔍 Performing detailed verification query...`);
    const { data: verifyData, error: verifyError } = await supabase
      .from('zoom_webinars')
      .select('webinar_id, actual_start_time, actual_duration, last_synced_at, status, webinar_uuid')
      .eq('user_id', user.id)
      .eq('webinar_id', webinarData.id?.toString())
      .single();
      
    if (verifyError) {
      console.error(`[DB-SYNC] ❌ Verification query failed:`, verifyError);
      console.error(`[DB-SYNC] Verification error code: ${verifyError.code}`);
      console.error(`[DB-SYNC] Verification error message: ${verifyError.message}`);
    } else {
      console.log(`[DB-SYNC] ✅ VERIFICATION SUCCESSFUL:`, verifyData);
      console.log(`[DB-SYNC] Final DB state:`);
      console.log(`[DB-SYNC] - webinar_id: ${verifyData.webinar_id}`);
      console.log(`[DB-SYNC] - actual_start_time: ${verifyData.actual_start_time}`);
      console.log(`[DB-SYNC] - actual_duration: ${verifyData.actual_duration}`);
      console.log(`[DB-SYNC] - status: ${verifyData.status}`);
      console.log(`[DB-SYNC] - webinar_uuid: ${verifyData.webinar_uuid}`);
      console.log(`[DB-SYNC] - last_synced_at: ${verifyData.last_synced_at}`);
      
      // Check if timing data was successfully saved
      if (webinarData.actual_start_time && !verifyData.actual_start_time) {
        console.error(`[DB-SYNC] ⚠️ WARNING: Expected timing data was not saved!`);
        console.error(`[DB-SYNC] Expected actual_start_time: ${webinarData.actual_start_time}`);
        console.error(`[DB-SYNC] Actual DB actual_start_time: ${verifyData.actual_start_time}`);
      } else if (webinarData.actual_start_time && verifyData.actual_start_time) {
        console.log(`[DB-SYNC] ✅ Timing data successfully saved to database`);
      }
    }
    
    console.log(`[DB-SYNC] === DATABASE SYNC END ===`);
    return { error: null, count: 1 };
    
  } catch (error) {
    console.error(`[DB-SYNC] ❌ EXCEPTION during database sync:`, error);
    console.error(`[DB-SYNC] Exception name: ${error.name}`);
    console.error(`[DB-SYNC] Exception message: ${error.message}`);
    console.error(`[DB-SYNC] Exception stack:`, error.stack);
    return { error, count: 0 };
  }
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
  console.log(`[zoom-api][data-syncer] Fetching instances for: ${webinarId}`);
  
  const instancesRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/instances`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!instancesRes.ok) {
    const errorText = await instancesRes.text();
    console.log(`[zoom-api][data-syncer] No instances found or error:`, errorText);
    return { count: 0, errors: [] };
  }

  const instancesData = await instancesRes.json();
  
  if (!instancesData.webinars || instancesData.webinars.length === 0) {
    return { count: 0, errors: [] };
  }

  let syncedCount = 0;
  const errors: string[] = [];

  // Process each instance
  for (const instance of instancesData.webinars) {
    const { error: instanceError } = await supabase
      .from('zoom_webinar_instances')
      .upsert({
        user_id: user.id,
        webinar_id: webinarId,
        webinar_uuid: instance.uuid,
        instance_id: instance.uuid,
        topic: instance.topic,
        start_time: instance.start_time,
        duration: instance.duration,
        raw_data: instance
      }, {
        onConflict: 'user_id,webinar_id,instance_id'
      });
    
    if (instanceError) {
      console.error(`[zoom-api][data-syncer] Error inserting instance:`, instanceError);
      errors.push(`Instance ${instance.uuid}: ${instanceError.message}`);
    } else {
      syncedCount += 1;
    }
  }
  
  console.log(`[zoom-api][data-syncer] Synced ${syncedCount} instances for: ${webinarId}`);
  return { count: syncedCount, errors };
}
