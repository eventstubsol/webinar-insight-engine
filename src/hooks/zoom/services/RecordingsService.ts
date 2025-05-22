
import { BaseZoomService } from './base/BaseZoomService';
import { supabase } from '@/integrations/supabase/client';

/**
 * RecordingsService - Service for managing recording data
 */
export class RecordingsService extends BaseZoomService {
  /**
   * Fetch webinar recording data for a specific webinar
   */
  static async fetchWebinarRecordings(userId: string, webinarId: string) {
    try {
      console.log(`[RecordingsService] Fetching recordings for webinar ID: ${webinarId}`);
      
      const { data, error } = await supabase
        .from('zoom_webinar_recordings')
        .select('*')
        .eq('user_id', userId)
        .eq('webinar_id', webinarId)
        .order('recording_start', { ascending: false });
        
      if (error) throw error;
      
      return {
        recordings: data || [],
        totalRecordings: data?.length || 0,
        totalDuration: data?.reduce((acc, rec) => acc + (rec.duration || 0), 0) || 0
      };
    } catch (error) {
      console.error('[RecordingsService] Error fetching webinar recordings:', error);
      throw error;
    }
  }
}
