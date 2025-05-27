
/**
 * Handles logging sync history for webinar instances
 */
export async function logInstanceSyncHistory(
  supabase: any, 
  userId: string, 
  webinarId: string, 
  instances: any[], 
  isRecurring: boolean,
  success: boolean = true,
  errorMessage?: string
) {
  const status = success ? 'success' : 'error';
  const message = success 
    ? `Synced ${instances.length} instances for webinar ${webinarId} (${isRecurring ? 'recurring' : 'single-occurrence'})`
    : errorMessage || 'Unknown error occurred during instance sync';
  
  await supabase
    .from('zoom_sync_history')
    .insert({
      user_id: userId,
      sync_type: 'webinar_instances',
      status: status,
      items_synced: success ? instances.length : 0,
      message: message
    });
}
