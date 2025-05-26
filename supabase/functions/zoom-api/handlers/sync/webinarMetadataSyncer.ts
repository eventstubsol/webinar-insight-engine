// Functions for syncing webinar metadata to database with enhanced logging for actual timing data
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
