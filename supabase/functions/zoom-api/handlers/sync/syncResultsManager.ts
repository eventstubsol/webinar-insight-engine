
// Helper for managing sync results and history
export interface SyncResults {
  webinar_updated: boolean;
  registrants_synced: number;
  attendees_synced: number;
  instances_synced: number;
  host_info_resolved: boolean;
  panelist_info_resolved: boolean;
  panelists_count: number;
  error_details: string[];
}

export function createInitialSyncResults(): SyncResults {
  return {
    webinar_updated: false,
    registrants_synced: 0,
    attendees_synced: 0,
    instances_synced: 0,
    host_info_resolved: false,
    panelist_info_resolved: false,
    panelists_count: 0,
    error_details: []
  };
}

export async function recordSyncHistory(
  supabase: any,
  user: any,
  webinarId: string,
  totalItemsSynced: number,
  syncResults: SyncResults,
  status: 'success' | 'partial_success' | 'error',
  errorMessage?: string
) {
  const syncMessage = errorMessage || 
    `Single webinar sync for ${webinarId}: ${syncResults.registrants_synced} registrants, ${syncResults.attendees_synced} attendees, ${syncResults.instances_synced} instances, host info: ${syncResults.host_info_resolved ? 'resolved' : 'missing'}, panelists: ${syncResults.panelists_count}`;
  
  await supabase
    .from('zoom_sync_history')
    .insert({
      user_id: user.id,
      sync_type: 'single-webinar',
      status,
      items_synced: totalItemsSynced,
      message: syncMessage,
      sync_details: syncResults
    });
}
