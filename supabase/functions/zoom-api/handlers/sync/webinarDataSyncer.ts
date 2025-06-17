// Functions for syncing webinar data to database with enhanced host information and new fields
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

  // Extract settings and other nested data from webinarData
  const settings = webinarData.settings || {};
  const trackingFields = webinarData.tracking_fields || [];
  const recurrence = webinarData.recurrence || null;
  const occurrences = webinarData.occurrences || [];

  const { error: webinarError } = await supabase
    .from('zoom_webinars')
    .upsert({
      user_id: user.id,
      webinar_id: webinarData.id,
      webinar_uuid: webinarData.uuid,
      topic: webinarData.topic,
      start_time: webinarData.start_time,
      duration: webinarData.duration,
      timezone: webinarData.timezone,
      agenda: webinarData.agenda || '',
      host_email: hostEmail || null,
      host_id: hostId || null,
      host_name: hostName || null,
      host_first_name: hostFirstName || null,
      host_last_name: hostLastName || null,
      status: webinarData.status,
      type: webinarData.type,
      
      // Password fields
      password: webinarData.password || null,
      h323_password: webinarData.h323_password || null,
      pstn_password: webinarData.pstn_password || null,
      encrypted_password: webinarData.encrypted_password || null,
      
      // JSONB fields for complex data
      settings: settings,
      tracking_fields: trackingFields,
      recurrence: recurrence,
      occurrences: occurrences,
      
      // URLs
      join_url: webinarData.join_url || null,
      registration_url: webinarData.registration_url || null,
      start_url: webinarData.start_url || null,
      
      // Configuration fields
      approval_type: webinarData.approval_type || null,
      registration_type: webinarData.registration_type || null,
      auto_recording_type: webinarData.auto_recording_type || null,
      enforce_login: webinarData.enforce_login || false,
      on_demand: webinarData.on_demand || false,
      practice_session: webinarData.practice_session || false,
      hd_video: webinarData.hd_video || false,
      host_video: webinarData.host_video || true,
      panelists_video: webinarData.panelists_video || true,
      audio_type: webinarData.audio_type || 'both',
      language: webinarData.language || 'en-US',
      contact_name: webinarData.contact_name || null,
      contact_email: webinarData.contact_email || null,
      
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
  
  // Insert new registrants with enhanced fields
  const registrantsToInsert = registrantsData.registrants.map((registrant: any) => ({
    user_id: user.id,
    webinar_id: webinarId,
    participant_type: 'registrant',
    participant_id: registrant.id,
    email: registrant.email,
    name: `${registrant.first_name} ${registrant.last_name}`.trim(),
    join_time: registrant.create_time,
    
    // New fields for registrants (if available in custom questions)
    job_title: registrant.job_title || null,
    purchasing_time_frame: registrant.purchasing_time_frame || null,
    role_in_purchase_process: registrant.role_in_purchase_process || null,
    no_of_employees: registrant.no_of_employees || null,
    industry: registrant.industry || null,
    org: registrant.org || null,
    language: registrant.language || null,
    
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
  
  // Insert new attendees with enhanced fields
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
    
    // New fields for participants
    connection_type: attendee.connection_type || null,
    data_center: attendee.data_center || null,
    pc_name: attendee.pc_name || null,
    domain: attendee.domain || null,
    mac_addr: attendee.mac_addr || null,
    harddisk_id: attendee.harddisk_id || null,
    recording_consent: attendee.recording_consent || false,
    
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

// New functions for syncing the new table data
export async function syncPanelists(supabase: any, user: any, token: string, webinarId: string) {
  console.log(`[zoom-api][data-syncer] Fetching panelists for: ${webinarId}`);
  
  const panelistsRes = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/panelists`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!panelistsRes.ok) {
    const errorText = await panelistsRes.text();
    console.log(`[zoom-api][data-syncer] No panelists found or error:`, errorText);
    return { count: 0, error: null };
  }

  const panelistsData = await panelistsRes.json();
  
  if (!panelistsData.panelists || panelistsData.panelists.length === 0) {
    return { count: 0, error: null };
  }

  // Delete existing panelists for this webinar
  await supabase
    .from('zoom_panelists')
    .delete()
    .eq('user_id', user.id)
    .eq('webinar_id', webinarId);
  
  // Insert new panelists
  const panelistsToInsert = panelistsData.panelists.map((panelist: any) => ({
    user_id: user.id,
    webinar_id: webinarId,
    panelist_id: panelist.id,
    panelist_email: panelist.email,
    name: panelist.name,
    join_url: panelist.join_url,
    raw_data: panelist
  }));
  
  const { error: panelistsError } = await supabase
    .from('zoom_panelists')
    .insert(panelistsToInsert);
  
  if (panelistsError) {
    console.error(`[zoom-api][data-syncer] Error inserting panelists:`, panelistsError);
  } else {
    console.log(`[zoom-api][data-syncer] Synced ${panelistsData.panelists.length} panelists for: ${webinarId}`);
  }

  return { 
    count: panelistsError ? 0 : panelistsData.panelists.length, 
    error: panelistsError 
  };
}

export async function syncChatMessages(supabase: any, user: any, token: string, webinarId: string, instanceId?: string) {
  console.log(`[zoom-api][data-syncer] Fetching chat messages for: ${webinarId}`);
  
  // Use instance-specific endpoint if instance ID is provided
  const chatEndpoint = instanceId 
    ? `https://api.zoom.us/v2/past_webinars/${instanceId}/qa`
    : `https://api.zoom.us/v2/past_webinars/${webinarId}/qa`;
    
  const chatRes = await fetch(chatEndpoint, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!chatRes.ok) {
    const errorText = await chatRes.text();
    console.log(`[zoom-api][data-syncer] No chat messages found or error:`, errorText);
    return { count: 0, error: null };
  }

  const chatData = await chatRes.json();
  
  if (!chatData.questions || chatData.questions.length === 0) {
    return { count: 0, error: null };
  }

  // Delete existing chat messages for this webinar/instance
  let deleteQuery = supabase
    .from('zoom_chat_messages')
    .delete()
    .eq('user_id', user.id)
    .eq('webinar_id', webinarId);
    
  if (instanceId) {
    deleteQuery = deleteQuery.eq('instance_id', instanceId);
  }
  
  await deleteQuery;
  
  // Insert new chat messages
  const chatMessagesToInsert = chatData.questions.map((question: any) => ({
    user_id: user.id,
    webinar_id: webinarId,
    instance_id: instanceId || null,
    sender_name: question.name,
    sender_email: question.email,
    message: question.question,
    sent_at: question.date_time,
    raw_data: question
  }));
  
  const { error: chatError } = await supabase
    .from('zoom_chat_messages')
    .insert(chatMessagesToInsert);
  
  if (chatError) {
    console.error(`[zoom-api][data-syncer] Error inserting chat messages:`, chatError);
  } else {
    console.log(`[zoom-api][data-syncer] Synced ${chatData.questions.length} chat messages for: ${webinarId}`);
  }

  return { 
    count: chatError ? 0 : chatData.questions.length, 
    error: chatError 
  };
}

export async function syncWebinarTracking(supabase: any, user: any, token: string, webinarId: string) {
  console.log(`[zoom-api][data-syncer] Fetching tracking data for: ${webinarId}`);
  
  const trackingRes = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/tracking_sources`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!trackingRes.ok) {
    const errorText = await trackingRes.text();
    console.log(`[zoom-api][data-syncer] No tracking data found or error:`, errorText);
    return { count: 0, error: null };
  }

  const trackingData = await trackingRes.json();
  
  if (!trackingData.tracking_sources || trackingData.tracking_sources.length === 0) {
    return { count: 0, error: null };
  }

  // Delete existing tracking data for this webinar
  await supabase
    .from('zoom_webinar_tracking')
    .delete()
    .eq('user_id', user.id)
    .eq('webinar_id', webinarId);
  
  // Insert new tracking data
  const trackingToInsert = trackingData.tracking_sources.map((source: any) => ({
    user_id: user.id,
    webinar_id: webinarId,
    source_name: source.source_name,
    tracking_url: source.tracking_url,
    visitor_count: source.visitor_count || 0,
    registration_count: source.registration_count || 0,
    raw_data: source
  }));
  
  const { error: trackingError } = await supabase
    .from('zoom_webinar_tracking')
    .insert(trackingToInsert);
  
  if (trackingError) {
    console.error(`[zoom-api][data-syncer] Error inserting tracking data:`, trackingError);
  } else {
    console.log(`[zoom-api][data-syncer] Synced ${trackingData.tracking_sources.length} tracking sources for: ${webinarId}`);
  }

  return { 
    count: trackingError ? 0 : trackingData.tracking_sources.length, 
    error: trackingError 
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
