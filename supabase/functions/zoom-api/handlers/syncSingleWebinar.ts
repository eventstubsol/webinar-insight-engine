
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

// Enhanced function to fetch actual timing data with comprehensive logging
async function fetchSingleWebinarActualTiming(token: string, webinarData: any) {
  const webinarId = webinarData.id;
  const status = webinarData.status?.toLowerCase();
  
  console.log(`[zoom-api][sync-single-webinar] === TIMING DEBUG START ===`);
  console.log(`[zoom-api][sync-single-webinar] Webinar ID: ${webinarId}, Status: ${status}`);
  console.log(`[zoom-api][sync-single-webinar] Full webinar data keys:`, Object.keys(webinarData));
  console.log(`[zoom-api][sync-single-webinar] Webinar data structure:`, JSON.stringify(webinarData, null, 2));
  
  // Check all possible UUID fields
  const possibleUuidFields = ['webinar_uuid', 'uuid', 'webinar_id', 'id'];
  let webinarUuid = null;
  
  for (const field of possibleUuidFields) {
    if (webinarData[field]) {
      console.log(`[zoom-api][sync-single-webinar] Found UUID in field '${field}': ${webinarData[field]}`);
      webinarUuid = webinarData[field];
      break;
    }
  }
  
  console.log(`[zoom-api][sync-single-webinar] Final webinarUuid: ${webinarUuid}`);
  console.log(`[zoom-api][sync-single-webinar] Status check - ended: ${status === 'ended'}, aborted: ${status === 'aborted'}`);
  
  // Only fetch for ended or aborted webinars that have a UUID
  if (!webinarUuid || (status !== 'ended' && status !== 'aborted')) {
    console.log(`[zoom-api][sync-single-webinar] SKIPPING timing fetch - Reason:`);
    console.log(`[zoom-api][sync-single-webinar] - Has UUID: ${!!webinarUuid}`);
    console.log(`[zoom-api][sync-single-webinar] - Status is ended/aborted: ${status === 'ended' || status === 'aborted'}`);
    console.log(`[zoom-api][sync-single-webinar] === TIMING DEBUG END (SKIPPED) ===`);
    return null;
  }
  
  try {
    console.log(`[zoom-api][sync-single-webinar] ATTEMPTING to fetch past webinar data for ${webinarId} (UUID: ${webinarUuid})`);
    
    const response = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarUuid}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[zoom-api][sync-single-webinar] API Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[zoom-api][sync-single-webinar] API Error response body: ${errorText}`);
      
      if (response.status === 404) {
        console.log(`[zoom-api][sync-single-webinar] Past webinar data not found for ${webinarId}, may not have been started`);
        console.log(`[zoom-api][sync-single-webinar] === TIMING DEBUG END (404) ===`);
        return null;
      } else {
        console.error(`[zoom-api][sync-single-webinar] API call failed with status ${response.status}: ${errorText}`);
        console.log(`[zoom-api][sync-single-webinar] === TIMING DEBUG END (ERROR) ===`);
        throw new Error(`API call failed with status ${response.status}: ${errorText}`);
      }
    }
    
    const pastWebinarData = await response.json();
    console.log(`[zoom-api][sync-single-webinar] SUCCESS! Retrieved past webinar data for ${webinarId}`);
    console.log(`[zoom-api][sync-single-webinar] Past webinar data keys:`, Object.keys(pastWebinarData));
    console.log(`[zoom-api][sync-single-webinar] Past webinar data:`, JSON.stringify(pastWebinarData, null, 2));
    
    // Extract actual timing data
    const actualStartTime = pastWebinarData.start_time || null;
    const actualEndTime = pastWebinarData.end_time || null;
    let actualDuration = pastWebinarData.duration || null;
    
    console.log(`[zoom-api][sync-single-webinar] Extracted timing data:`);
    console.log(`[zoom-api][sync-single-webinar] - actualStartTime: ${actualStartTime}`);
    console.log(`[zoom-api][sync-single-webinar] - actualEndTime: ${actualEndTime}`);
    console.log(`[zoom-api][sync-single-webinar] - actualDuration: ${actualDuration}`);
    
    // Calculate duration if we have start and end times but no duration
    if (actualStartTime && actualEndTime && !actualDuration) {
      const startMs = new Date(actualStartTime).getTime();
      const endMs = new Date(actualEndTime).getTime();
      actualDuration = Math.round((endMs - startMs) / (1000 * 60)); // Duration in minutes
      console.log(`[zoom-api][sync-single-webinar] Calculated duration: ${actualDuration} minutes`);
    }
    
    const result = {
      actual_start_time: actualStartTime,
      actual_duration: actualDuration,
      actual_end_time: actualEndTime,
      participants_count: pastWebinarData.participants_count || webinarData.participants_count || 0
    };
    
    console.log(`[zoom-api][sync-single-webinar] Final timing result:`, JSON.stringify(result, null, 2));
    console.log(`[zoom-api][sync-single-webinar] === TIMING DEBUG END (SUCCESS) ===`);
    
    return result;
    
  } catch (error) {
    console.error(`[zoom-api][sync-single-webinar] EXCEPTION while fetching past webinar data for ${webinarId}:`, error);
    console.log(`[zoom-api][sync-single-webinar] Error stack:`, error.stack);
    console.log(`[zoom-api][sync-single-webinar] === TIMING DEBUG END (EXCEPTION) ===`);
    return null;
  }
}

// Handle syncing a single webinar's complete data with enhanced logging
export async function handleSyncSingleWebinar(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  if (!webinarId) {
    throw new Error('Webinar ID is required');
  }
  
  console.log(`[zoom-api][sync-single-webinar] Starting sync for webinar: ${webinarId}`);
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  let totalItemsSynced = 0;
  const syncResults = createInitialSyncResults();
  
  try {
    // 1. Sync webinar metadata with enhanced host and panelist resolution
    console.log(`[zoom-api][sync-single-webinar] Step 1: Fetching webinar metadata for: ${webinarId}`);
    const webinarRes = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (webinarRes.ok) {
      const webinarData = await webinarRes.json();
      console.log(`[zoom-api][sync-single-webinar] Retrieved webinar metadata for ${webinarId}`);
      
      // Enhanced host information resolution with complete name data
      const { hostEmail, hostId, hostName, hostFirstName, hostLastName } = await getHostInfo(token, webinarData);
      
      if (hostEmail) {
        syncResults.host_info_resolved = true;
        console.log(`[zoom-api][sync-single-webinar] Host info resolved:`, {
          email: hostEmail,
          name: hostName,
          first_name: hostFirstName,
          last_name: hostLastName
        });
      } else {
        console.warn(`[zoom-api][sync-single-webinar] Could not resolve host email for webinar: ${webinarId}`);
      }
      
      // Enhanced panelist information resolution
      const panelistData = await getPanelistInfo(token, webinarId);
      if (panelistData.length > 0) {
        syncResults.panelist_info_resolved = true;
        syncResults.panelists_count = panelistData.length;
        console.log(`[zoom-api][sync-single-webinar] Panelist info resolved: ${panelistData.length} panelists`);
        
        // Add panelist data to webinar raw_data
        webinarData.panelists = panelistData;
        webinarData.panelists_count = panelistData.length;
      } else {
        console.log(`[zoom-api][sync-single-webinar] No panelists found for webinar: ${webinarId}`);
      }
      
      // ENHANCED: Fetch actual timing data for ended webinars with comprehensive logging
      console.log(`[zoom-api][sync-single-webinar] Step 1.5: Starting actual timing data fetch process`);
      const actualTimingData = await fetchSingleWebinarActualTiming(token, webinarData);
      
      if (actualTimingData) {
        // Merge actual timing data into webinar data
        console.log(`[zoom-api][sync-single-webinar] MERGING timing data into webinar:`, actualTimingData);
        Object.assign(webinarData, actualTimingData);
        syncResults.actual_timing_resolved = true;
        console.log(`[zoom-api][sync-single-webinar] SUCCESS: Actual timing data resolved for webinar: ${webinarId}`);
      } else {
        console.log(`[zoom-api][sync-single-webinar] No actual timing data available for webinar: ${webinarId}`);
      }
      
      // Log what we're about to send to the database
      console.log(`[zoom-api][sync-single-webinar] About to sync to database - webinar data includes:`);
      console.log(`[zoom-api][sync-single-webinar] - actual_start_time: ${webinarData.actual_start_time}`);
      console.log(`[zoom-api][sync-single-webinar] - actual_duration: ${webinarData.actual_duration}`);
      console.log(`[zoom-api][sync-single-webinar] - actual_end_time: ${webinarData.actual_end_time}`);
      
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
        console.error(`[zoom-api][sync-single-webinar] Error updating webinar:`, webinarError);
        syncResults.error_details.push(`Webinar metadata: ${webinarError.message}`);
      } else {
        syncResults.webinar_updated = true;
        totalItemsSynced += 1;
        console.log(`[zoom-api][sync-single-webinar] SUCCESS: Updated webinar metadata for: ${webinarId} with complete info:`, {
          email: hostEmail || 'unknown',
          name: hostName || 'unknown',
          panelists: syncResults.panelists_count,
          actualTiming: syncResults.actual_timing_resolved
        });
        
        // Verify the database update worked
        console.log(`[zoom-api][sync-single-webinar] Verifying database update...`);
        const { data: verifyData, error: verifyError } = await supabase
          .from('zoom_webinars')
          .select('actual_start_time, actual_duration, actual_end_time')
          .eq('user_id', user.id)
          .eq('webinar_id', webinarId)
          .single();
          
        if (verifyError) {
          console.error(`[zoom-api][sync-single-webinar] Error verifying database update:`, verifyError);
        } else {
          console.log(`[zoom-api][sync-single-webinar] Database verification result:`, verifyData);
        }
      }
    } else {
      const errorText = await webinarRes.text();
      console.error(`[zoom-api][sync-single-webinar] Failed to fetch webinar metadata:`, errorText);
      syncResults.error_details.push(`Webinar metadata: ${errorText}`);
    }
    
    // 2. Sync registrants
    const registrantsResult = await syncRegistrants(supabase, user, token, webinarId);
    if (registrantsResult.error) {
      syncResults.error_details.push(`Registrants: ${registrantsResult.error.message}`);
    } else {
      syncResults.registrants_synced = registrantsResult.count;
      totalItemsSynced += registrantsResult.count;
    }
    
    // 3. Sync attendees (for completed webinars)
    const attendeesResult = await syncAttendees(supabase, user, token, webinarId);
    if (attendeesResult.error) {
      syncResults.error_details.push(`Attendees: ${attendeesResult.error.message}`);
    } else {
      syncResults.attendees_synced = attendeesResult.count;
      totalItemsSynced += attendeesResult.count;
    }
    
    // 4. Sync webinar instances (for recurring webinars)
    const instancesResult = await syncWebinarInstances(supabase, user, token, webinarId);
    if (instancesResult.errors.length > 0) {
      syncResults.error_details.push(...instancesResult.errors);
    }
    syncResults.instances_synced = instancesResult.count;
    totalItemsSynced += instancesResult.count;
    
    // Record sync in history with enhanced results
    await recordSyncHistory(
      supabase,
      user,
      webinarId,
      totalItemsSynced,
      syncResults,
      syncResults.error_details.length > 0 ? 'partial_success' : 'success'
    );
    
    console.log(`[zoom-api][sync-single-webinar] FINAL RESULT: Completed sync for webinar: ${webinarId}`);
    console.log(`[zoom-api][sync-single-webinar] - Total items: ${totalItemsSynced}`);
    console.log(`[zoom-api][sync-single-webinar] - Host resolved: ${syncResults.host_info_resolved}`);
    console.log(`[zoom-api][sync-single-webinar] - Panelists: ${syncResults.panelists_count}`);
    console.log(`[zoom-api][sync-single-webinar] - Actual timing: ${syncResults.actual_timing_resolved}`);
    
    return new Response(JSON.stringify({
      success: true,
      webinar_id: webinarId,
      items_synced: totalItemsSynced,
      sync_results: syncResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error(`[zoom-api][sync-single-webinar] FATAL ERROR syncing webinar ${webinarId}:`, error);
    console.error(`[zoom-api][sync-single-webinar] Error stack:`, error.stack);
    
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
