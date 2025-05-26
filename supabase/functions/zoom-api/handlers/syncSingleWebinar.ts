
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
import { fetchPastWebinarDetails } from './sync/actualTimingDataProcessor.ts';

// Handle syncing a single webinar's complete data with enhanced host information
export async function handleSyncSingleWebinar(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  if (!webinarId) {
    throw new Error('Webinar ID is required');
  }
  
  const { sync_timing_only } = await req.json();
  console.log(`[zoom-api][sync-single-webinar] Starting sync for webinar: ${webinarId}, timing only: ${sync_timing_only}`);
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  let totalItemsSynced = 0;
  const syncResults = createInitialSyncResults();
  
  try {
    // If timing-only sync, just update timing data
    if (sync_timing_only) {
      console.log(`[zoom-api][sync-single-webinar] Performing timing-only sync for webinar: ${webinarId}`);
      
      // Get the webinar from database first
      const { data: webinarData, error: webinarError } = await supabase
        .from('zoom_webinars')
        .select('webinar_uuid, status')
        .eq('webinar_id', webinarId)
        .eq('user_id', user.id)
        .single();
      
      if (webinarError || !webinarData) {
        throw new Error(`Webinar not found: ${webinarId}`);
      }
      
      if (webinarData.status !== 'ended') {
        throw new Error('Timing data is only available for completed webinars');
      }
      
      if (!webinarData.webinar_uuid) {
        throw new Error('Webinar UUID is required for timing data sync');
      }
      
      // Fetch actual timing data from past webinar API
      const pastWebinarData = await fetchPastWebinarDetails(webinarData.webinar_uuid, token);
      
      if (pastWebinarData) {
        // Update webinar with actual timing data
        const { error: updateError } = await supabase
          .from('zoom_webinars')
          .update({
            actual_start_time: pastWebinarData.start_time,
            actual_end_time: pastWebinarData.end_time,
            actual_duration: pastWebinarData.duration,
            participants_count: pastWebinarData.total_participants || null,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('webinar_id', webinarId)
          .eq('user_id', user.id);
        
        if (updateError) {
          throw new Error(`Failed to update timing data: ${updateError.message}`);
        }
        
        syncResults.webinar_updated = true;
        syncResults.timing_data_synced = true;
        totalItemsSynced = 1;
        
        console.log(`[zoom-api][sync-single-webinar] ✅ Timing data updated for webinar ${webinarId}:`, {
          actual_start_time: pastWebinarData.start_time,
          actual_duration: pastWebinarData.duration,
          participants: pastWebinarData.total_participants
        });
      } else {
        throw new Error('No timing data available from Zoom API');
      }
      
      // Record successful timing sync
      await recordSyncHistory(
        supabase,
        user,
        webinarId,
        totalItemsSynced,
        syncResults,
        'success',
        `Timing data synced successfully`
      );
      
      return new Response(JSON.stringify({
        success: true,
        webinar_id: webinarId,
        items_synced: totalItemsSynced,
        sync_results: syncResults,
        timing_only: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
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
      
      // Update webinar in database with enhanced host and panelist information
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
        console.log(`[zoom-api][sync-single-webinar] Updated webinar metadata for: ${webinarId} with complete host info:`, {
          email: hostEmail || 'unknown',
          name: hostName || 'unknown',
          panelists: syncResults.panelists_count
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
    
    // Record sync in history with enhanced results including complete host and panelist info
    await recordSyncHistory(
      supabase,
      user,
      webinarId,
      totalItemsSynced,
      syncResults,
      syncResults.error_details.length > 0 ? 'partial_success' : 'success'
    );
    
    console.log(`[zoom-api][sync-single-webinar] Completed sync for webinar: ${webinarId}, total items: ${totalItemsSynced}, host resolved: ${syncResults.host_info_resolved}, panelists: ${syncResults.panelists_count}`);
    
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
