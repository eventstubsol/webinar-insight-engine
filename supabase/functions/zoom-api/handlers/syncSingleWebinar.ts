
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
import { enhanceWebinarsWithActualTimingData } from './sync/actualTimingDataProcessor.ts';

// Enhanced single webinar sync with comprehensive data collection
export async function handleSyncSingleWebinar(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  console.log(`[SINGLE-SYNC] 🚀 === ENHANCED SINGLE WEBINAR SYNC START ===`);
  console.log(`[SINGLE-SYNC] Target webinar: ${webinarId}`);
  console.log(`[SINGLE-SYNC] User: ${user?.id}`);
  console.log(`[SINGLE-SYNC] Timestamp: ${new Date().toISOString()}`);
  
  if (!webinarId) {
    console.error(`[SINGLE-SYNC] ❌ No webinar ID provided`);
    throw new Error('Webinar ID is required');
  }
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  console.log(`[SINGLE-SYNC] ✅ Zoom token obtained successfully`);
  
  let totalItemsSynced = 0;
  const syncResults = createInitialSyncResults();
  
  try {
    // Step 1: Sync webinar metadata with enhanced host and panelist resolution
    console.log(`[SINGLE-SYNC] 📋 Step 1: Fetching comprehensive webinar metadata for: ${webinarId}`);
    const webinarRes = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[SINGLE-SYNC] Webinar metadata API response: ${webinarRes.status} ${webinarRes.statusText}`);
    
    if (webinarRes.ok) {
      const webinarData = await webinarRes.json();
      console.log(`[SINGLE-SYNC] ✅ Retrieved webinar metadata successfully`);
      console.log(`[SINGLE-SYNC] - Status: ${webinarData.status}`);
      console.log(`[SINGLE-SYNC] - Topic: ${webinarData.topic}`);
      console.log(`[SINGLE-SYNC] - UUID fields available:`, {
        uuid: webinarData.uuid,
        webinar_uuid: webinarData.webinar_uuid,
        id: webinarData.id
      });
      
      // Enhanced host information resolution
      const { hostEmail, hostId, hostName, hostFirstName, hostLastName } = await getHostInfo(token, webinarData);
      
      if (hostEmail) {
        syncResults.host_info_resolved = true;
        console.log(`[SINGLE-SYNC] ✅ Host info resolved: ${hostEmail} (${hostName || 'No name'})`);
      } else {
        console.warn(`[SINGLE-SYNC] ⚠️ Could not resolve host email`);
      }
      
      // Enhanced panelist information resolution
      const panelistData = await getPanelistInfo(token, webinarId);
      if (panelistData.length > 0) {
        syncResults.panelist_info_resolved = true;
        syncResults.panelists_count = panelistData.length;
        console.log(`[SINGLE-SYNC] ✅ Panelist info resolved: ${panelistData.length} panelists found`);
        
        // Add panelist data to webinar raw_data
        webinarData.panelists = panelistData;
        webinarData.panelists_count = panelistData.length;
      } else {
        console.log(`[SINGLE-SYNC] ℹ️ No panelists found for this webinar`);
      }
      
      // CRITICAL FIX: Use the enhanced timing data processor for comprehensive timing collection
      console.log(`[SINGLE-SYNC] ⏰ Step 1.5: ENHANCED TIMING DATA COLLECTION using comprehensive processor`);
      try {
        console.log(`[SINGLE-SYNC] 🔄 Calling enhanced timing processor for single webinar...`);
        const webinarsWithTiming = await enhanceWebinarsWithActualTimingData([webinarData], token);
        
        if (webinarsWithTiming && webinarsWithTiming.length > 0) {
          const enhancedWebinar = webinarsWithTiming[0];
          if (enhancedWebinar.actual_start_time || enhancedWebinar.actual_duration) {
            console.log(`[SINGLE-SYNC] 🎯 ✅ ENHANCED TIMING DATA SUCCESSFULLY RETRIEVED!`);
            console.log(`[SINGLE-SYNC] Enhanced timing details:`, {
              actual_start_time: enhancedWebinar.actual_start_time,
              actual_duration: enhancedWebinar.actual_duration,
              actual_end_time: enhancedWebinar.actual_end_time,
              participants_count: enhancedWebinar.participants_count
            });
            
            // Merge the enhanced timing data into the webinar
            Object.assign(webinarData, {
              actual_start_time: enhancedWebinar.actual_start_time,
              actual_duration: enhancedWebinar.actual_duration,
              actual_end_time: enhancedWebinar.actual_end_time,
              participants_count: enhancedWebinar.participants_count || webinarData.participants_count
            });
            
            syncResults.actual_timing_resolved = true;
            console.log(`[SINGLE-SYNC] ✅ SUCCESS: Enhanced timing data merged into webinar metadata`);
          } else {
            console.log(`[SINGLE-SYNC] ℹ️ Enhanced processor returned webinar but no timing data available`);
          }
        } else {
          console.log(`[SINGLE-SYNC] ⚠️ Enhanced processor returned empty or invalid result`);
        }
      } catch (timingError) {
        console.warn(`[SINGLE-SYNC] ⚠️ Enhanced timing collection failed:`, timingError.message);
        console.log(`[SINGLE-SYNC] Continuing sync without timing data...`);
        // Continue the sync even if timing data fails
      }
      
      // Log final data state before database sync
      console.log(`[SINGLE-SYNC] 💾 Final webinar data before database sync:`);
      console.log(`[SINGLE-SYNC] - actual_start_time: ${webinarData.actual_start_time}`);
      console.log(`[SINGLE-SYNC] - actual_duration: ${webinarData.actual_duration}`);
      console.log(`[SINGLE-SYNC] - host_email: ${webinarData.host_email || hostEmail}`);
      console.log(`[SINGLE-SYNC] - panelists_count: ${webinarData.panelists_count || 0}`);
      
      // Update webinar in database with all enhanced information
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
        console.error(`[SINGLE-SYNC] ❌ Error updating webinar metadata:`, webinarError);
        syncResults.error_details.push(`Webinar metadata: ${webinarError.message}`);
      } else {
        syncResults.webinar_updated = true;
        totalItemsSynced += 1;
        console.log(`[SINGLE-SYNC] ✅ Webinar metadata updated successfully in database`);
      }
    } else {
      const errorText = await webinarRes.text();
      console.error(`[SINGLE-SYNC] ❌ Failed to fetch webinar metadata:`, errorText);
      syncResults.error_details.push(`Webinar metadata: ${errorText}`);
    }
    
    // Step 2: Sync registrants with enhanced error handling
    console.log(`[SINGLE-SYNC] 👥 Step 2: Syncing registrants for comprehensive data collection`);
    try {
      const registrantsResult = await syncRegistrants(supabase, user, token, webinarId);
      if (registrantsResult.error) {
        syncResults.error_details.push(`Registrants: ${registrantsResult.error.message}`);
      } else {
        syncResults.registrants_synced = registrantsResult.count;
        totalItemsSynced += registrantsResult.count;
        console.log(`[SINGLE-SYNC] ✅ Synced ${registrantsResult.count} registrants successfully`);
      }
    } catch (error) {
      console.error(`[SINGLE-SYNC] ❌ Registrants sync failed:`, error);
      syncResults.error_details.push(`Registrants: ${error.message}`);
    }
    
    // Step 3: Sync attendees with enhanced error handling
    console.log(`[SINGLE-SYNC] 🎯 Step 3: Syncing attendees for comprehensive participation data`);
    try {
      const attendeesResult = await syncAttendees(supabase, user, token, webinarId);
      if (attendeesResult.error) {
        syncResults.error_details.push(`Attendees: ${attendeesResult.error.message}`);
      } else {
        syncResults.attendees_synced = attendeesResult.count;
        totalItemsSynced += attendeesResult.count;
        console.log(`[SINGLE-SYNC] ✅ Synced ${attendeesResult.count} attendees successfully`);
      }
    } catch (error) {
      console.error(`[SINGLE-SYNC] ❌ Attendees sync failed:`, error);
      syncResults.error_details.push(`Attendees: ${error.message}`);
    }
    
    // Step 4: Sync webinar instances with enhanced error handling
    console.log(`[SINGLE-SYNC] 🔄 Step 4: Syncing instances for recurring webinar data`);
    try {
      const instancesResult = await syncWebinarInstances(supabase, user, token, webinarId);
      if (instancesResult.errors.length > 0) {
        syncResults.error_details.push(...instancesResult.errors);
      }
      syncResults.instances_synced = instancesResult.count;
      totalItemsSynced += instancesResult.count;
      console.log(`[SINGLE-SYNC] ✅ Synced ${instancesResult.count} instances successfully`);
    } catch (error) {
      console.error(`[SINGLE-SYNC] ❌ Instances sync failed:`, error);
      syncResults.error_details.push(`Instances: ${error.message}`);
    }
    
    // Record comprehensive sync results in history
    const syncStatus = syncResults.error_details.length > 0 ? 'partial_success' : 'success';
    await recordSyncHistory(
      supabase,
      user,
      webinarId,
      totalItemsSynced,
      syncResults,
      syncStatus
    );
    
    console.log(`[SINGLE-SYNC] 🎉 === ENHANCED SINGLE WEBINAR SYNC COMPLETED ===`);
    console.log(`[SINGLE-SYNC] Final comprehensive results:`);
    console.log(`[SINGLE-SYNC] - Total items synced: ${totalItemsSynced}`);
    console.log(`[SINGLE-SYNC] - Host info resolved: ${syncResults.host_info_resolved}`);
    console.log(`[SINGLE-SYNC] - Panelists found: ${syncResults.panelists_count}`);
    console.log(`[SINGLE-SYNC] - Actual timing resolved: ${syncResults.actual_timing_resolved}`);
    console.log(`[SINGLE-SYNC] - Registrants synced: ${syncResults.registrants_synced}`);
    console.log(`[SINGLE-SYNC] - Attendees synced: ${syncResults.attendees_synced}`);
    console.log(`[SINGLE-SYNC] - Instances synced: ${syncResults.instances_synced}`);
    console.log(`[SINGLE-SYNC] - Errors encountered: ${syncResults.error_details.length}`);
    
    return new Response(JSON.stringify({
      success: true,
      webinar_id: webinarId,
      items_synced: totalItemsSynced,
      sync_results: syncResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error(`[SINGLE-SYNC] ❌ CRITICAL ERROR in enhanced single webinar sync:`, error);
    console.error(`[SINGLE-SYNC] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Record failed sync in history with comprehensive error details
    await recordSyncHistory(
      supabase,
      user,
      webinarId,
      totalItemsSynced,
      syncResults,
      'error',
      `Enhanced single webinar sync failed for ${webinarId}: ${error.message}`
    );
    
    throw error;
  }
}
