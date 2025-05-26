
import { zoomDatabaseService } from './zoomDatabaseService';

/**
 * Fetch sync history - now uses the centralized database service
 */
export async function fetchSyncHistory(userId: string): Promise<any[]> {
  if (!userId) return [];
  
  try {
    return await zoomDatabaseService.getSyncHistory(userId);
  } catch (err) {
    console.error('Error fetching sync history:', err);
    return [];
  }
}
