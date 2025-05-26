
import { formatDistanceToNow } from 'https://deno.land/x/date_fns@v2.22.1/index.js';

export interface SyncResults {
  webinar_updated: boolean;
  host_info_resolved: boolean;
  panelist_info_resolved: boolean;
  actual_timing_resolved: boolean; // NEW: Track if actual timing data was fetched
  panelists_count: number;
  registrants_synced: number;
  attendees_synced: number;
  instances_synced: number;
  error_details: string[];
}

export function createInitialSyncResults(): SyncResults {
  return {
    webinar_updated: false,
    host_info_resolved: false,
    panelist_info_resolved: false,
    actual_timing_resolved: false, // NEW: Initialize actual timing flag
    panelists_count: 0,
    registrants_synced: 0,
    attendees_synced: 0,
    instances_synced: 0,
    error_details: []
  };
}

export async function recordSyncHistory(
  supabase: any,
  user: any,
  webinarId: string,
  itemsSynced: number,
  syncResults: SyncResults,
  status: 'success' | 'partial_success' | 'error',
  errorMessage?: string
) {
  try {
    const syncType = 'single-webinar';
    
    // Enhanced message with actual timing status
    let message = `Synced webinar ${webinarId}: ${itemsSynced} items`;
    if (syncResults.host_info_resolved) message += ', host resolved';
    if (syncResults.panelist_info_resolved) message += `, ${syncResults.panelists_count} panelists`;
    if (syncResults.actual_timing_resolved) message += ', actual timing data fetched'; // NEW: Include timing status
    if (syncResults.registrants_synced > 0) message += `, ${syncResults.registrants_synced} registrants`;
    if (syncResults.attendees_synced > 0) message += `, ${syncResults.attendees_synced} attendees`;
    if (syncResults.instances_synced > 0) message += `, ${syncResults.instances_synced} instances`;
    
    if (errorMessage) {
      message += `. Error: ${errorMessage}`;
    }
    
    if (syncResults.error_details.length > 0) {
      message += `. Issues: ${syncResults.error_details.join(', ')}`;
    }
    
    const { error } = await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: syncType,
        status: status,
        items_synced: itemsSynced,
        message: message,
        sync_details: {
          webinar_id: webinarId,
          sync_results: syncResults,
          timestamp: new Date().toISOString()
        }
      });
    
    if (error) {
      console.error('[sync-results-manager] Error recording sync history:', error);
    } else {
      console.log(`[sync-results-manager] Recorded sync history: ${message}`);
    }
  } catch (error) {
    console.error('[sync-results-manager] Failed to record sync history:', error);
  }
}
