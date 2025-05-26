
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

// New function to fetch actual timing data for a single webinar
async function fetchSingleWebinarActualTiming(token: string, webinarData: any) {
  const webinarId = webinarData.id;
  const webinarUuid = webinarData.webinar_uuid || webinarData.uuid;
  const status = webinarData.status?.toLowerCase();
  
  console.log(`[zoom-api][sync-single-webinar] Checking actual timing for webinar ${webinarId}, status: ${status}, UUID: ${webinarUuid}`);
  
  // Only fetch for ended or aborted webinars that have a UUID
  if (!webinarUuid || (status !== 'ended' && status !== 'aborted')) {
    console.log(`[zoom-api][sync-single-webinar] Skipping actual timing fetch - not an ended webinar or no UUID`);
    return null;
  }
  
  try {
    console.log(`[zoom-api][sync-single-webinar] Fetching past webinar data for ${webinarId} (UUID: ${webinarUuid})`);
    
    const response = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarUuid}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[zoom-api][sync-single-webinar] Past webinar data not found for ${webinarId}, may not have been started`);
        return null;
      } else {
        throw new Error(`API call failed with status ${response.status}`);
      }
    }
    
    const pastWebinarData = await response.json();
    console.log(`[zoom-api][sync-single-webinar] Successfully fetched past webinar data for ${webinarId}`);
    
    // Extract actual timing data
    const actualStartTime = pastWebinarData.start_time || null;
    const actualEndTime = pastWebinarData.end_time || null;
    let actualDuration = pastWebinarData.duration || null;
    
    // Calculate duration if we have start and end times but no duration
    if (actualStartTime && actualEndTime && !actualDuration) {
      const startMs = new Date(actualStartTime).getTime();
      const endMs = new Date(actualEndTime).getTime();
      actualDuration = Math.round((endMs - startMs) / (1000 * 60)); // Duration in minutes
    }
    
    console.log(`[zoom-api][sync-single-webinar] Extracted timing data for ${webinarId}:`, {
      actualStartTime,
      actualDuration,
      actualEndTime
    });
    
    return {
      actual_start_time: actualStartTime,
      actual_duration: actualDuration,
      actual_end_time: actualEndTime,
      participants_count: pastWebinarData.participants_count || webinarData.participants_count || 0
    };
    
  } catch (error) {
    console.error(`[zoom-api][sync-single-webinar] Error fetching past webinar data for ${webinarId}:`, error);
    return null;
  }
}

// Handle syncing a single webinar's complete data with enhanced host information and actual timing data
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
    console.log(`[zoom-api][sync-single-webinar] Fetching webinar metadata for: ${webinarId}`);
    const webinarRes = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (webinarRes.ok) {
      const webinarData = await webinarRes.json();
      
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
      
      // NEW: Fetch actual timing data for ended webinars
      console.log(`[zoom-api][sync-single-webinar] Step 1.5: Fetching actual timing data`);
      const actualTimingData = await fetchSingleWebinarActualTiming(token, webinarData);
      
      if (actualTimingData) {
        // Merge actual timing data into webinar data
        Object.assign(webinarData, actualTimingData);
        syncResults.actual_timing_resolved = true;
        console.log(`[zoom-api][sync-single-webinar] Actual timing data resolved for webinar: ${webinarId}`);
      } else {
        console.log(`[zoom-api][sync-single-webinar] No actual timing data available for webinar: ${webinarId}`);
      }
      
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
        console.log(`[zoom-api][sync-single-webinar] Updated webinar metadata for: ${webinarId} with complete info:`, {
          email: hostEmail || 'unknown',
          name: hostName || 'unknown',
          panelists: syncResults.panelists_count,
          actualTiming: syncResults.actual_timing_resolved
        });
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
    
    // Record sync in history with enhanced results including complete host, panelist, and timing info
    await recordSyncHistory(
      supabase,
      user,
      webinarId,
      totalItemsSynced,
      syncResults,
      syncResults.error_details.length > 0 ? 'partial_success' : 'success'
    );
    
    console.log(`[zoom-api][sync-single-webinar] Completed sync for webinar: ${webinarId}, total items: ${totalItemsSynced}, host resolved: ${syncResults.host_info_resolved}, panelists: ${syncResults.panelists_count}, actual timing: ${syncResults.actual_timing_resolved}`);
    
    return new Response(JSON.stringify({
      success: true,
      webinar_id: webinarId,
      items_synced: totalItemsSynced,
      sync_results: syncResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error(`[zoom-api][sync-single-webinar] Error syncing webinar ${webinarId}:`, error);
    
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
