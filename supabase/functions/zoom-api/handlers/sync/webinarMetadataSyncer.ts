
// CRITICAL FIX: Enhanced database sync with proper timing data preservation
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
  console.log(`[DB-SYNC] 💾 === CRITICAL TIMING DATA FIX ===`);
  console.log(`[DB-SYNC] Syncing webinar metadata for: ${webinarData.id}`);
  console.log(`[DB-SYNC] User ID: ${user.id}`);
  
  try {
    // CRITICAL: Log incoming timing data before any processing
    console.log(`[DB-SYNC] 🎯 INCOMING TIMING DATA VALIDATION:`);
    console.log(`[DB-SYNC] - webinarData.actual_start_time: ${webinarData.actual_start_time} (type: ${typeof webinarData.actual_start_time})`);
    console.log(`[DB-SYNC] - webinarData.actual_duration: ${webinarData.actual_duration} (type: ${typeof webinarData.actual_duration})`);
    console.log(`[DB-SYNC] - webinarData.actual_end_time: ${webinarData.actual_end_time} (type: ${typeof webinarData.actual_end_time})`);
    console.log(`[DB-SYNC] - webinarData.status: ${webinarData.status}`);
    
    // CRITICAL: Preserve any existing actual timing data before processing
    let preservedActualStartTime = webinarData.actual_start_time;
    let preservedActualDuration = webinarData.actual_duration;
    
    // If new timing data is provided, use it; otherwise try to preserve existing
    if (!preservedActualStartTime && webinarData.raw_data?.past_webinar_data?.start_time) {
      preservedActualStartTime = webinarData.raw_data.past_webinar_data.start_time;
      console.log(`[DB-SYNC] 🔄 Extracted start time from past_webinar_data: ${preservedActualStartTime}`);
    }
    
    if (!preservedActualDuration && webinarData.raw_data?.past_webinar_data?.duration) {
      preservedActualDuration = webinarData.raw_data.past_webinar_data.duration;
      console.log(`[DB-SYNC] 🔄 Extracted duration from past_webinar_data: ${preservedActualDuration}`);
    }
    
    // ENHANCED webinar record with CRITICAL timing data preservation
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
      
      // HOST INFORMATION
      host_id: hostId || webinarData.host_id,
      host_email: hostEmail || webinarData.host_email,
      host_name: hostName || webinarData.host_name,
      host_first_name: hostFirstName || webinarData.host_first_name,
      host_last_name: hostLastName || webinarData.host_last_name,
      
      // 🎯 CRITICAL TIMING FIELDS - Main fix implementation
      actual_start_time: preservedActualStartTime ? new Date(preservedActualStartTime).toISOString() : null,
      actual_duration: preservedActualDuration ? parseInt(preservedActualDuration.toString()) : null,
      
      // SETTINGS
      approval_type: webinarData.settings?.approval_type || webinarData.approval_type,
      registration_type: webinarData.settings?.registration_type || webinarData.registration_type,
      enforce_login: webinarData.settings?.enforce_login || false,
      on_demand: webinarData.settings?.on_demand || false,
      practice_session: webinarData.settings?.practice_session || false,
      hd_video: webinarData.settings?.hd_video || false,
      host_video: webinarData.settings?.host_video !== undefined ? webinarData.settings.host_video : true,
      panelists_video: webinarData.settings?.panelists_video !== undefined ? webinarData.settings.panelists_video : true,
      is_simulive: webinarData.settings?.is_simulive || false,
      auto_recording_type: webinarData.settings?.auto_recording || null,
      contact_name: webinarData.settings?.contact_name || null,
      contact_email: webinarData.settings?.contact_email || null,
      language: webinarData.settings?.language || 'en-US',
      audio_type: webinarData.settings?.audio || 'both',
      
      // SYSTEM FIELDS
      last_synced_at: new Date().toISOString(),
      raw_data: webinarData
    };
    
    console.log(`[DB-SYNC] 🎯 CRITICAL DATABASE RECORD VALIDATION:`);
    console.log(`[DB-SYNC] - actual_start_time: ${webinarRecord.actual_start_time} (type: ${typeof webinarRecord.actual_start_time})`);
    console.log(`[DB-SYNC] - actual_duration: ${webinarRecord.actual_duration} (type: ${typeof webinarRecord.actual_duration})`);
    console.log(`[DB-SYNC] - webinar_uuid: ${webinarRecord.webinar_uuid}`);
    console.log(`[DB-SYNC] - status: ${webinarRecord.status}`);
    console.log(`[DB-SYNC] - host_email: ${webinarRecord.host_email}`);
    
    console.log(`[DB-SYNC] 🚀 Executing CRITICAL upsert to zoom_webinars table...`);
    
    // CRITICAL upsert with enhanced error handling
    const { data: upsertData, error: upsertError } = await supabase
      .from('zoom_webinars')
      .upsert(webinarRecord, {
        onConflict: 'user_id,webinar_id',
        ignoreDuplicates: false
      })
      .select('actual_start_time, actual_duration, webinar_id, last_synced_at, host_email, host_name, status');
    
    if (upsertError) {
      console.error(`[DB-SYNC] ❌ CRITICAL UPSERT ERROR:`, upsertError);
      console.error(`[DB-SYNC] Error code: ${upsertError.code}`);
      console.error(`[DB-SYNC] Error message: ${upsertError.message}`);
      console.error(`[DB-SYNC] Error details:`, JSON.stringify(upsertError, null, 2));
      return { error: upsertError, count: 0 };
    }
    
    console.log(`[DB-SYNC] ✅ CRITICAL UPSERT SUCCESS!`);
    console.log(`[DB-SYNC] Upsert returned data:`, upsertData);
    
    // CRITICAL verification query to confirm timing data was stored
    console.log(`[DB-SYNC] 🔍 Performing CRITICAL verification query...`);
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('zoom_webinars')
      .select('webinar_id, actual_start_time, actual_duration, last_synced_at, status, webinar_uuid, host_email, host_name, topic')
      .eq('user_id', user.id)
      .eq('webinar_id', webinarData.id?.toString())
      .single();
      
    if (verifyError) {
      console.error(`[DB-SYNC] ❌ CRITICAL verification query failed:`, verifyError);
    } else {
      console.log(`[DB-SYNC] ✅ CRITICAL VERIFICATION SUCCESSFUL:`, verifyData);
      
      // CRITICAL validation of timing data persistence
      console.log(`[DB-SYNC] 🎯 CRITICAL TIMING DATA PERSISTENCE CHECK:`);
      console.log(`[DB-SYNC] - Input actual_start_time: ${preservedActualStartTime}`);
      console.log(`[DB-SYNC] - Stored actual_start_time: ${verifyData.actual_start_time}`);
      console.log(`[DB-SYNC] - Input actual_duration: ${preservedActualDuration}`);
      console.log(`[DB-SYNC] - Stored actual_duration: ${verifyData.actual_duration}`);
      
      if (preservedActualStartTime && !verifyData.actual_start_time) {
        console.error(`[DB-SYNC] 🚨 CRITICAL ERROR: Timing data was LOST during database operation!`);
        console.error(`[DB-SYNC] Expected: ${preservedActualStartTime}, Got: ${verifyData.actual_start_time}`);
      } else if (preservedActualStartTime && verifyData.actual_start_time) {
        console.log(`[DB-SYNC] ✅ 🎯 CRITICAL SUCCESS: Actual start time successfully persisted!`);
      }
      
      if (preservedActualDuration && !verifyData.actual_duration) {
        console.error(`[DB-SYNC] 🚨 CRITICAL ERROR: Duration data was LOST during database operation!`);
        console.error(`[DB-SYNC] Expected: ${preservedActualDuration}, Got: ${verifyData.actual_duration}`);
      } else if (preservedActualDuration && verifyData.actual_duration) {
        console.log(`[DB-SYNC] ✅ 🎯 CRITICAL SUCCESS: Actual duration successfully persisted!`);
      }
    }
    
    console.log(`[DB-SYNC] === CRITICAL TIMING DATA FIX COMPLETE ===`);
    return { error: null, count: 1 };
    
  } catch (error) {
    console.error(`[DB-SYNC] ❌ CRITICAL EXCEPTION during database sync:`, error);
    console.error(`[DB-SYNC] Exception name: ${error.name}`);
    console.error(`[DB-SYNC] Exception message: ${error.message}`);
    
    return { error, count: 0 };
  }
}
