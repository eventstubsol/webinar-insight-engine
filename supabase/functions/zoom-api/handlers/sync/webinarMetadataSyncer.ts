
// ENHANCED functions for syncing webinar metadata with comprehensive timing data handling and robust error recovery
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
  console.log(`[DB-SYNC] 💾 === ENHANCED DATABASE SYNC START ===`);
  console.log(`[DB-SYNC] Syncing comprehensive webinar metadata for: ${webinarData.id}`);
  console.log(`[DB-SYNC] User ID: ${user.id}`);
  console.log(`[DB-SYNC] Timestamp: ${new Date().toISOString()}`);
  
  try {
    // ENHANCED logging for timing data validation
    console.log(`[DB-SYNC] 📊 COMPREHENSIVE input timing data validation:`);
    console.log(`[DB-SYNC] - webinarData.actual_start_time: ${webinarData.actual_start_time} (type: ${typeof webinarData.actual_start_time})`);
    console.log(`[DB-SYNC] - webinarData.actual_duration: ${webinarData.actual_duration} (type: ${typeof webinarData.actual_duration})`);
    console.log(`[DB-SYNC] - webinarData.actual_end_time: ${webinarData.actual_end_time} (type: ${typeof webinarData.actual_end_time})`);
    console.log(`[DB-SYNC] - webinarData.status: ${webinarData.status}`);
    console.log(`[DB-SYNC] - webinarData.participants_count: ${webinarData.participants_count}`);
    
    // ENHANCED webinar record preparation with comprehensive field mapping and data validation
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
      
      // ENHANCED HOST INFORMATION with comprehensive field coverage and validation
      host_id: hostId || webinarData.host_id,
      host_email: hostEmail || webinarData.host_email,
      host_name: hostName || webinarData.host_name,
      host_first_name: hostFirstName || webinarData.host_first_name,
      host_last_name: hostLastName || webinarData.host_last_name,
      
      // 🎯 CRITICAL TIMING FIELDS - The main fix for missing actual timing data with enhanced validation
      actual_start_time: webinarData.actual_start_time ? new Date(webinarData.actual_start_time).toISOString() : null,
      actual_duration: webinarData.actual_duration ? parseInt(webinarData.actual_duration) : null,
      
      // ENHANCED SETTINGS with comprehensive coverage and defaults
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
      
      // ENHANCED SYSTEM FIELDS
      last_synced_at: new Date().toISOString(),
      raw_data: webinarData
    };
    
    console.log(`[DB-SYNC] 🎯 ENHANCED database record timing fields verification:`);
    console.log(`[DB-SYNC] - actual_start_time: ${webinarRecord.actual_start_time} (type: ${typeof webinarRecord.actual_start_time})`);
    console.log(`[DB-SYNC] - actual_duration: ${webinarRecord.actual_duration} (type: ${typeof webinarRecord.actual_duration})`);
    console.log(`[DB-SYNC] - webinar_uuid: ${webinarRecord.webinar_uuid}`);
    console.log(`[DB-SYNC] - status: ${webinarRecord.status}`);
    console.log(`[DB-SYNC] - host_email: ${webinarRecord.host_email}`);
    console.log(`[DB-SYNC] - host_name: ${webinarRecord.host_name}`);
    
    console.log(`[DB-SYNC] 🚀 Executing ENHANCED upsert to zoom_webinars table...`);
    
    // ENHANCED upsert with comprehensive error handling and retry logic
    let upsertData;
    let upsertError;
    const MAX_UPSERT_RETRIES = 3;
    
    for (let attempt = 1; attempt <= MAX_UPSERT_RETRIES; attempt++) {
      try {
        console.log(`[DB-SYNC] 🔄 Upsert attempt ${attempt}/${MAX_UPSERT_RETRIES}`);
        
        const result = await supabase
          .from('zoom_webinars')
          .upsert(webinarRecord, {
            onConflict: 'user_id,webinar_id',
            ignoreDuplicates: false
          })
          .select('actual_start_time, actual_duration, webinar_id, last_synced_at, host_email, host_name');
        
        upsertData = result.data;
        upsertError = result.error;
        
        if (!upsertError) {
          console.log(`[DB-SYNC] ✅ Upsert successful on attempt ${attempt}`);
          break;
        } else {
          console.warn(`[DB-SYNC] ⚠️ Upsert failed on attempt ${attempt}:`, upsertError);
          if (attempt === MAX_UPSERT_RETRIES) break;
          
          // Brief delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } catch (exception) {
        console.error(`[DB-SYNC] ❌ Upsert exception on attempt ${attempt}:`, exception);
        upsertError = exception;
        if (attempt === MAX_UPSERT_RETRIES) break;
      }
    }
    
    if (upsertError) {
      console.error(`[DB-SYNC] ❌ ENHANCED UPSERT ERROR after ${MAX_UPSERT_RETRIES} attempts:`, upsertError);
      console.error(`[DB-SYNC] Error code: ${upsertError.code}`);
      console.error(`[DB-SYNC] Error message: ${upsertError.message}`);
      console.error(`[DB-SYNC] Error details:`, JSON.stringify(upsertError, null, 2));
      return { error: upsertError, count: 0 };
    }
    
    console.log(`[DB-SYNC] ✅ ENHANCED UPSERT SUCCESS after retry logic!`);
    console.log(`[DB-SYNC] Upsert returned data:`, upsertData);
    
    // ENHANCED verification query with comprehensive field validation and retry logic
    console.log(`[DB-SYNC] 🔍 Performing ENHANCED verification query with retry logic...`);
    let verifyData;
    let verifyError;
    const MAX_VERIFY_RETRIES = 3;
    
    for (let attempt = 1; attempt <= MAX_VERIFY_RETRIES; attempt++) {
      try {
        console.log(`[DB-SYNC] 🔄 Verification attempt ${attempt}/${MAX_VERIFY_RETRIES}`);
        
        const result = await supabase
          .from('zoom_webinars')
          .select('webinar_id, actual_start_time, actual_duration, last_synced_at, status, webinar_uuid, host_email, host_name, topic')
          .eq('user_id', user.id)
          .eq('webinar_id', webinarData.id?.toString())
          .single();
        
        verifyData = result.data;
        verifyError = result.error;
        
        if (!verifyError) {
          console.log(`[DB-SYNC] ✅ Verification successful on attempt ${attempt}`);
          break;
        } else {
          console.warn(`[DB-SYNC] ⚠️ Verification failed on attempt ${attempt}:`, verifyError);
          if (attempt === MAX_VERIFY_RETRIES) break;
          
          // Brief delay before retry
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      } catch (exception) {
        console.error(`[DB-SYNC] ❌ Verification exception on attempt ${attempt}:`, exception);
        verifyError = exception;
        if (attempt === MAX_VERIFY_RETRIES) break;
      }
    }
      
    if (verifyError) {
      console.error(`[DB-SYNC] ❌ ENHANCED verification query failed after ${MAX_VERIFY_RETRIES} attempts:`, verifyError);
      console.error(`[DB-SYNC] Verification error code: ${verifyError.code}`);
      console.error(`[DB-SYNC] Verification error message: ${verifyError.message}`);
    } else {
      console.log(`[DB-SYNC] ✅ ENHANCED COMPREHENSIVE VERIFICATION SUCCESSFUL:`, verifyData);
      console.log(`[DB-SYNC] 📊 Final database state verification with enhanced validation:`);
      console.log(`[DB-SYNC] - webinar_id: ${verifyData.webinar_id}`);
      console.log(`[DB-SYNC] - topic: ${verifyData.topic}`);
      console.log(`[DB-SYNC] - 🎯 actual_start_time: ${verifyData.actual_start_time} (CRITICAL FIELD)`);
      console.log(`[DB-SYNC] - 🎯 actual_duration: ${verifyData.actual_duration} (CRITICAL FIELD)`);
      console.log(`[DB-SYNC] - status: ${verifyData.status}`);
      console.log(`[DB-SYNC] - webinar_uuid: ${verifyData.webinar_uuid}`);
      console.log(`[DB-SYNC] - host_email: ${verifyData.host_email}`);
      console.log(`[DB-SYNC] - host_name: ${verifyData.host_name}`);
      console.log(`[DB-SYNC] - last_synced_at: ${verifyData.last_synced_at}`);
      
      // ENHANCED validation of critical timing data persistence with detailed reporting
      if (webinarData.actual_start_time && !verifyData.actual_start_time) {
        console.error(`[DB-SYNC] ⚠️ CRITICAL WARNING: Expected timing data was not persisted!`);
        console.error(`[DB-SYNC] Expected actual_start_time: ${webinarData.actual_start_time}`);
        console.error(`[DB-SYNC] Actual DB actual_start_time: ${verifyData.actual_start_time}`);
      } else if (webinarData.actual_start_time && verifyData.actual_start_time) {
        console.log(`[DB-SYNC] ✅ 🎯 CRITICAL SUCCESS: Actual start time successfully persisted in database`);
      } else {
        console.log(`[DB-SYNC] ℹ️ No actual start time was provided for persistence`);
      }
      
      if (webinarData.actual_duration && !verifyData.actual_duration) {
        console.error(`[DB-SYNC] ⚠️ CRITICAL WARNING: Expected duration data was not persisted!`);
        console.error(`[DB-SYNC] Expected actual_duration: ${webinarData.actual_duration}`);
        console.error(`[DB-SYNC] Actual DB actual_duration: ${verifyData.actual_duration}`);
      } else if (webinarData.actual_duration && verifyData.actual_duration) {
        console.log(`[DB-SYNC] ✅ 🎯 CRITICAL SUCCESS: Actual duration successfully persisted in database`);
      } else {
        console.log(`[DB-SYNC] ℹ️ No actual duration was provided for persistence`);
      }
      
      // ENHANCED validation of host information persistence
      if ((hostEmail || webinarData.host_email) && verifyData.host_email) {
        console.log(`[DB-SYNC] ✅ Host email successfully persisted: ${verifyData.host_email}`);
      }
      
      if ((hostName || webinarData.host_name) && verifyData.host_name) {
        console.log(`[DB-SYNC] ✅ Host name successfully persisted: ${verifyData.host_name}`);
      }
    }
    
    console.log(`[DB-SYNC] === ENHANCED DATABASE SYNC END ===`);
    return { error: null, count: 1 };
    
  } catch (error) {
    console.error(`[DB-SYNC] ❌ CRITICAL EXCEPTION during enhanced database sync:`, error);
    console.error(`[DB-SYNC] Exception name: ${error.name}`);
    console.error(`[DB-SYNC] Exception message: ${error.message}`);
    console.error(`[DB-SYNC] Exception stack:`, error.stack?.substring(0, 1000));
    
    // ENHANCED error recovery: try a simplified upsert as last resort
    console.log(`[DB-SYNC] 🔄 Attempting simplified upsert as error recovery...`);
    try {
      const simplifiedRecord = {
        user_id: user.id,
        webinar_id: webinarData.id?.toString(),
        webinar_uuid: webinarData.uuid || webinarData.webinar_uuid,
        topic: webinarData.topic || 'Unknown Topic',
        status: webinarData.status || 'unknown',
        actual_start_time: webinarData.actual_start_time ? new Date(webinarData.actual_start_time).toISOString() : null,
        actual_duration: webinarData.actual_duration ? parseInt(webinarData.actual_duration) : null,
        last_synced_at: new Date().toISOString(),
        raw_data: webinarData
      };
      
      const { error: recoveryError } = await supabase
        .from('zoom_webinars')
        .upsert(simplifiedRecord, {
          onConflict: 'user_id,webinar_id',
          ignoreDuplicates: false
        });
      
      if (!recoveryError) {
        console.log(`[DB-SYNC] ✅ Simplified upsert recovery successful`);
        return { error: null, count: 1 };
      } else {
        console.error(`[DB-SYNC] ❌ Simplified upsert recovery also failed:`, recoveryError);
      }
    } catch (recoveryException) {
      console.error(`[DB-SYNC] ❌ Exception during recovery attempt:`, recoveryException);
    }
    
    return { error, count: 0 };
  }
}
