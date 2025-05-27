
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
): Promise<void> {
  try {
    const status = success ? 'success' : 'error';
    const message = success 
      ? `Synced ${instances.length} instances for webinar ${webinarId} (${isRecurring ? 'recurring' : 'single-occurrence'})`
      : errorMessage || 'Unknown error occurred during instance sync';
    
    console.log(`[zoom-api][sync-logger] 📝 Logging sync history: ${status} - ${message}`);
    
    const { error } = await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: userId,
        sync_type: 'webinar_instances',
        status: status,
        items_synced: success ? instances.length : 0,
        message: message,
        sync_details: {
          webinar_id: webinarId,
          is_recurring: isRecurring,
          instances_processed: instances.length,
          error_message: errorMessage || null
        }
      });
    
    if (error) {
      console.error(`[zoom-api][sync-logger] ❌ Error logging sync history:`, error);
      throw new Error(`Failed to log sync history: ${error.message}`);
    } else {
      console.log(`[zoom-api][sync-logger] ✅ Successfully logged sync history for webinar ${webinarId}`);
    }
  } catch (error) {
    console.error(`[zoom-api][sync-logger] ❌ Error in sync history logging:`, error);
    // Don't throw here as logging failure shouldn't break the main process
  }
}
