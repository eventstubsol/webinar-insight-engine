
/**
 * Helper functions for Zoom API operations
 */

// Record a sync operation in the history table
export async function recordSyncHistory(
  supabase: any, 
  userId: string, 
  syncType: string, 
  status: string, 
  itemsSynced: number, 
  message?: string
) {
  try {
    await supabase.from('zoom_sync_history').insert({
      user_id: userId,
      sync_type: syncType,
      status: status,
      items_synced: itemsSynced,
      message: message
    });
  } catch (error) {
    console.error('Error recording sync history:', error);
    // We don't throw here to avoid breaking the main function
  }
}

// Format dates for API requests
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Parse Zoom API timestamp to Date
export function parseZoomTimestamp(timestamp: string): Date | null {
  if (!timestamp) return null;
  
  try {
    return new Date(timestamp);
  } catch (e) {
    console.error('Error parsing timestamp:', e);
    return null;
  }
}

// Format duration in minutes to human-readable format
export function formatDuration(minutes: number): string {
  if (!minutes) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  
  return `${mins}m`;
}

// Sleep function for rate limiting
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
