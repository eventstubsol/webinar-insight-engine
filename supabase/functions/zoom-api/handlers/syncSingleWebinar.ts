
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { getHostInfo } from './sync/hostResolver.ts';
import { getPanelistInfo } from './sync/panelistResolver.ts';
import { 
  syncWebinarMetadata,
  syncRegistrants,
  syncAttendees,
  syncWebinarInstances
} from './sync/webinarDataSyncer.ts';
import { 
  createInitialSyncResults,
  recordSyncHistory,
  type SyncResults
} from './sync/syncResultsManager.ts';

// Enhanced function to fetch actual timing data with improved status detection
async function fetchSingleWebinarActualTiming(token: string, webinarData: any) {
  const webinarId = webinarData.id;
  const apiStatus = webinarData.status?.toLowerCase();
  
  console.log(`[TIMING-DEBUG] === ENHANCED TIMING FETCH START ===`);
  console.log(`[TIMING-DEBUG] Webinar ID: ${webinarId}`);
  console.log(`[TIMING-DEBUG] API Status: ${apiStatus} (type: ${typeof apiStatus})`);
  
  // ENHANCED: Better UUID field detection with validation
  const possibleUuidFields = [
    { field: 'uuid', value: webinarData.uuid },
    { field: 'webinar_uuid', value: webinarData.webinar_uuid },
    { field: 'id', value: webinarData.id?.toString() },
    { field: 'webinar_id', value: webinarData.webinar_id?.toString() }
  ];
  
  console.log(`[TIMING-DEBUG] Available UUID fields:`, possibleUuidFields);
  
  // Find the first valid UUID (should be a string with reasonable length)
  const validUuidField = possibleUuidFields.find(({ value }) => 
    value && typeof value === 'string' && value.length > 10
  );
  
  if (!validUuidField) {
    console.log(`[TIMING-DEBUG] ❌ SKIPPING: No valid UUID found in any field`);
    console.log(`[TIMING-DEBUG] === TIMING FETCH END (NO VALID UUID) ===`);
    return null;
  }
  
  const webinarUuid = validUuidField.value;
  console.log(`[TIMING-DEBUG] ✅ Using UUID from field '${validUuidField.field}': ${webinarUuid}`);
  
  // IMPROVED: Enhanced status detection logic
  let shouldFetchTiming = false;
  const now = new Date();
  
  // Check if explicitly ended or aborted
  if (apiStatus === 'ended' || apiStatus === 'aborted') {
    shouldFetchTiming = true;
    console.log(`[TIMING-DEBUG] ✅ Webinar explicitly marked as '${apiStatus}'`);
  }
  // Check if status is undefined/null but webinar should be ended based on time
  else if (!apiStatus || apiStatus === 'undefined') {
    console.log(`[TIMING-DEBUG] ⚠️ Status is '${apiStatus}', checking time-based logic`);
    
    if (webinarData.start_time && webinarData.duration) {
      const startTime = new Date(webinarData.start_time);
      const endTime = new Date(startTime.getTime() + (webinarData.duration * 60 * 1000));
      
      console.log(`[TIMING-DEBUG] Scheduled start: ${startTime.toISOString()}`);
      console.log(`[TIMING-DEBUG] Scheduled end: ${endTime.toISOString()}`);
      console.log(`[TIMING-DEBUG] Current time: ${now.toISOString()}`);
      
      if (now > endTime) {
        shouldFetchTiming = true;
        console.log(`[TIMING-DEBUG] ✅ Current time is past scheduled end time - treating as ended`);
      } else {
        console.log(`[TIMING-DEBUG] ❌ Webinar is still scheduled or ongoing`);
      }
    } else {
      console.log(`[TIMING-DEBUG] ❌ Missing start_time or duration for time-based check`);
    }
  }
  // For other statuses, try anyway and let the API response determine availability
  else {
    console.log(`[TIMING-DEBUG] ⚠️ Status '${apiStatus}' - will attempt fetch and let API respond`);
    shouldFetchTiming = true;
  }
  
  if (!shouldFetchTiming) {
    console.log(`[TIMING-DEBUG] ❌ SKIPPING: Conditions not met for timing data fetch`);
    console.log(`[TIMING-DEBUG] === TIMING FETCH END (CONDITIONS NOT MET) ===`);
    return null;
  }
  
  try {
    const apiUrl = `https://api.zoom.us/v2/past_webinars/${webinarUuid}`;
    console.log(`[TIMING-DEBUG] 🚀 Making API call to: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[TIMING-DEBUG] API Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[TIMING-DEBUG] ❌ API Error response: ${errorText}`);
      
      if (response.status === 404) {
        console.log(`[TIMING-DEBUG] 404 - Past webinar data not found (webinar may not have been started or completed yet)`);
        console.log(`[TIMING-DEBUG] === TIMING FETCH END (404) ===`);
        return null;
      } else {
        console.error(`[TIMING-DEBUG] API call failed with status ${response.status}: ${errorText}`);
        console.log(`[TIMING-DEBUG] === TIMING FETCH END (API ERROR) ===`);
        return null;
      }
    }
    
    const pastWebinarData = await response.json();
    console.log(`[TIMING-DEBUG] ✅ SUCCESS! Retrieved past webinar data`);
    console.log(`[TIMING-DEBUG] Raw API response keys:`, Object.keys(pastWebinarData));
    
    // Extract actual timing data with detailed logging
    const actualStartTime = pastWebinarData.start_time;
    const actualEndTime = pastWebinarData.end_time;
    let actualDuration = pastWebinarData.duration;
    
    console.log(`[TIMING-DEBUG] Raw timing data extracted:`);
    console.log(`[TIMING-DEBUG] - start_time: ${actualStartTime} (type: ${typeof actualStartTime})`);
    console.log(`[TIMING-DEBUG] - end_time: ${actualEndTime} (type: ${typeof actualEndTime})`);
    console.log(`[TIMING-DEBUG] - duration: ${actualDuration} (type: ${typeof actualDuration})`);
    
    // Calculate duration if we have start and end times but no duration
    if (actualStartTime && actualEndTime && !actualDuration) {
      const startMs = new Date(actualStartTime).getTime();
      const endMs = new Date(actualEndTime).getTime();
      actualDuration = Math.round((endMs - startMs) / (1000 * 60)); // Duration in minutes
      console.log(`[TIMING-DEBUG] ⚡ Calculated duration: ${actualDuration} minutes`);
    }
    
    const result = {
      actual_start_time: actualStartTime,
      actual_duration: actualDuration,
      actual_end_time: actualEndTime,
      participants_count: pastWebinarData.participants_count || webinarData.participants_count || 0
    };
    
    console.log(`[TIMING-DEBUG] 🎯 Final timing result:`, result);
    console.log(`[TIMING-DEBUG] === TIMING FETCH END (SUCCESS) ===`);
    
    return result;
    
  } catch (error) {
    console.error(`[TIMING-DEBUG] ❌ EXCEPTION while fetching past webinar data:`, error);
    console.error(`[TIMING-DEBUG] Error name: ${error.name}`);
    console.error(`[TIMING-DEBUG] Error message: ${error.message}`);
    console.log(`[TIMING-DEBUG] === TIMING FETCH END (EXCEPTION) ===`);
    return null;
  }
}

// Handle syncing a single webinar's complete data with enhanced logging
export async function handleSyncSingleWebinar(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  console.log(`[SYNC-DEBUG] 🚀 === SINGLE WEBINAR SYNC START ===`);
  console.log(`[SYNC-DEBUG] Function entry confirmed - handleSyncSingleWebinar is running`);
  console.log(`[SYNC-DEBUG] Parameters received:`);
  console.log(`[SYNC-DEBUG] - webinarId: ${webinarId}`);
  console.log(`[SYNC-DEBUG] - user.id: ${user?.id}`);
  console.log(`[SYNC-DEBUG] - timestamp: ${new Date().toISOString()}`);
  
  if (!webinarId) {
    console.error(`[SYNC-DEBUG] ❌ No webinar ID provided`);
    throw new Error('Webinar ID is required');
  }
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  console.log(`[SYNC-DEBUG] ✅ Zoom token obtained successfully`);
  
  let totalItemsSynced = 0;
  const syncResults = createInitialSyncResults();
  
  try {
    // 1. Sync webinar metadata with enhanced host and panelist resolution
    console.log(`[SYNC-DEBUG] 📋 Step 1: Fetching webinar metadata for: ${webinarId}`);
    const webinarRes = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[SYNC-DEBUG] Webinar metadata API response: ${webinarRes.status} ${webinarRes.statusText}`);
    
    if (webinarRes.ok) {
      const webinarData = await webinarRes.json();
      console.log(`[SYNC-DEBUG] ✅ Retrieved webinar metadata`);
      console.log(`[SYNC-DEBUG] Webinar status: ${webinarData.status}`);
      console.log(`[SYNC-DEBUG] Webinar topic: ${webinarData.topic}`);
      console.log(`[SYNC-DEBUG] Available UUID fields in webinarData:`, {
        uuid: webinarData.uuid,
        webinar_uuid: webinarData.webinar_uuid,
        id: webinarData.id
      });
      
      // Enhanced host information resolution with complete name data
      const { hostEmail, hostId, hostName, hostFirstName, hostLastName } = await getHostInfo(token, webinarData);
      
      if (hostEmail) {
        syncResults.host_info_resolved = true;
        console.log(`[SYNC-DEBUG] ✅ Host info resolved: ${hostEmail}`);
      } else {
        console.warn(`[SYNC-DEBUG] ⚠️ Could not resolve host email`);
      }
      
      // Enhanced panelist information resolution
      const panelistData = await getPanelistInfo(token, webinarId);
      if (panelistData.length > 0) {
        syncResults.panelist_info_resolved = true;
        syncResults.panelists_count = panelistData.length;
        console.log(`[SYNC-DEBUG] ✅ Panelist info resolved: ${panelistData.length} panelists`);
        
        // Add panelist data to webinar raw_data
        webinarData.panelists = panelistData;
        webinarData.panelists_count = panelistData.length;
      } else {
        console.log(`[SYNC-DEBUG] ℹ️ No panelists found`);
      }
      
      // ENHANCED: Fetch actual timing data with improved logic
      console.log(`[SYNC-DEBUG] ⏰ Step 1.5: Starting ENHANCED ACTUAL TIMING DATA fetch process`);
      const actualTimingData = await fetchSingleWebinarActualTiming(token, webinarData);
      
      if (actualTimingData) {
        console.log(`[SYNC-DEBUG] 🎯 TIMING DATA RETRIEVED! Merging into webinar:`, actualTimingData);
        Object.assign(webinarData, actualTimingData);
        syncResults.actual_timing_resolved = true;
        console.log(`[SYNC-DEBUG] ✅ SUCCESS: Actual timing data resolved and merged`);
        console.log(`[SYNC-DEBUG] Final webinar timing data:`, {
          actual_start_time: webinarData.actual_start_time,
          actual_duration: webinarData.actual_duration,
          actual_end_time: webinarData.actual_end_time
        });
      } else {
        console.log(`[SYNC-DEBUG] ❌ No actual timing data retrieved`);
      }
      
      // Log what we're about to send to the database
      console.log(`[SYNC-DEBUG] 💾 About to sync to database with timing data:`);
      console.log(`[SYNC-DEBUG] - actual_start_time: ${webinarData.actual_start_time}`);
      console.log(`[SYNC-DEBUG] - actual_duration: ${webinarData.actual_duration}`);
      console.log(`[SYNC-DEBUG] - actual_end_time: ${webinarData.actual_end_time}`);
      
      // Update webinar in database with enhanced host, panelist, and timing information
      const { error: webinarError } = await syncWebinarMetadata(
        supabase, 
        user, 
        webinarData, 
        hostEmail, 
        hostId, 
        hostName, 
        hostFirstName, 
        hostLastName
      );
      
      if (webinarError) {
        console.error(`[SYNC-DEBUG] ❌ Error updating webinar:`, webinarError);
        syncResults.error_details.push(`Webinar metadata: ${webinarError.message}`);
      } else {
        syncResults.webinar_updated = true;
        totalItemsSynced += 1;
        console.log(`[SYNC-DEBUG] ✅ Updated webinar metadata successfully`);
        
        // Enhanced verification of the database update
        console.log(`[SYNC-DEBUG] 🔍 Verifying database update...`);
        const { data: verifyData, error: verifyError } = await supabase
          .from('zoom_webinars')
          .select('actual_start_time, actual_duration, last_synced_at')
          .eq('user_id', user.id)
          .eq('webinar_id', webinarId)
          .single();
          
        if (verifyError) {
          console.error(`[SYNC-DEBUG] ❌ Error verifying database update:`, verifyError);
        } else {
          console.log(`[SYNC-DEBUG] 🔍 Database verification result:`, verifyData);
          console.log(`[SYNC-DEBUG] - DB actual_start_time: ${verifyData.actual_start_time}`);
          console.log(`[SYNC-DEBUG] - DB actual_duration: ${verifyData.actual_duration}`);
          console.log(`[SYNC-DEBUG] - DB last_synced_at: ${verifyData.last_synced_at}`);
        }
      }
    } else {
      const errorText = await webinarRes.text();
      console.error(`[SYNC-DEBUG] ❌ Failed to fetch webinar metadata:`, errorText);
      syncResults.error_details.push(`Webinar metadata: ${errorText}`);
    }
    
    // 2. Sync registrants
    console.log(`[SYNC-DEBUG] 👥 Step 2: Syncing registrants`);
    const registrantsResult = await syncRegistrants(supabase, user, token, webinarId);
    if (registrantsResult.error) {
      syncResults.error_details.push(`Registrants: ${registrantsResult.error.message}`);
    } else {
      syncResults.registrants_synced = registrantsResult.count;
      totalItemsSynced += registrantsResult.count;
      console.log(`[SYNC-DEBUG] ✅ Synced ${registrantsResult.count} registrants`);
    }
    
    // 3. Sync attendees (for completed webinars)
    console.log(`[SYNC-DEBUG] 🎯 Step 3: Syncing attendees`);
    const attendeesResult = await syncAttendees(supabase, user, token, webinarId);
    if (attendeesResult.error) {
      syncResults.error_details.push(`Attendees: ${attendeesResult.error.message}`);
    } else {
      syncResults.attendees_synced = attendeesResult.count;
      totalItemsSynced += attendeesResult.count;
      console.log(`[SYNC-DEBUG] ✅ Synced ${attendeesResult.count} attendees`);
    }
    
    // 4. Sync webinar instances (for recurring webinars)
    console.log(`[SYNC-DEBUG] 🔄 Step 4: Syncing instances`);
    const instancesResult = await syncWebinarInstances(supabase, user, token, webinarId);
    if (instancesResult.errors.length > 0) {
      syncResults.error_details.push(...instancesResult.errors);
    }
    syncResults.instances_synced = instancesResult.count;
    totalItemsSynced += instancesResult.count;
    console.log(`[SYNC-DEBUG] ✅ Synced ${instancesResult.count} instances`);
    
    // Record sync in history with enhanced results
    await recordSyncHistory(
      supabase,
      user,
      webinarId,
      totalItemsSynced,
      syncResults,
      syncResults.error_details.length > 0 ? 'partial_success' : 'success'
    );
    
    console.log(`[SYNC-DEBUG] 🎉 === SYNC COMPLETED SUCCESSFULLY ===`);
    console.log(`[SYNC-DEBUG] Final results:`);
    console.log(`[SYNC-DEBUG] - Total items: ${totalItemsSynced}`);
    console.log(`[SYNC-DEBUG] - Host resolved: ${syncResults.host_info_resolved}`);
    console.log(`[SYNC-DEBUG] - Panelists: ${syncResults.panelists_count}`);
    console.log(`[SYNC-DEBUG] - Actual timing resolved: ${syncResults.actual_timing_resolved}`);
    console.log(`[SYNC-DEBUG] - Errors: ${syncResults.error_details.length}`);
    
    return new Response(JSON.stringify({
      success: true,
      webinar_id: webinarId,
      items_synced: totalItemsSynced,
      sync_results: syncResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error(`[SYNC-DEBUG] ❌ FATAL ERROR in sync:`, error);
    console.error(`[SYNC-DEBUG] Error name: ${error.name}`);
    console.error(`[SYNC-DEBUG] Error message: ${error.message}`);
    console.error(`[SYNC-DEBUG] Error stack:`, error.stack);
    
    // Record failed sync in history
    await recordSyncHistory(
      supabase,
      user,
      webinarId,
      totalItemsSynced,
      syncResults,
      'error',
      `Failed to sync webinar ${webinarId}: ${error.message}`
    );
    
    throw error;
  }
}
