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

// Handle syncing a single webinar's complete data with enhanced host information
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
