
import { supabase } from '@/integrations/supabase/client';
import { BaseZoomService } from './base/BaseZoomService';

/**
 * SyncHistoryService - Service for managing sync history data
 */
export class SyncHistoryService extends BaseZoomService {
  /**
   * Fetch sync history
   */
  static async fetchSyncHistory(userId: string): Promise<any[]> {
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('zoom_sync_history')
        .select('*')
        .eq('user_id', userId)
        .eq('sync_type', 'webinars')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        return data;
      }
      return [];
    } catch (err) {
      console.error('Error fetching sync history:', err);
      return [];
    }
  }
}

// Export the static method as a standalone function for backward compatibility
export const fetchSyncHistory = SyncHistoryService.fetchSyncHistory;
