
import { supabase } from '@/integrations/supabase/client';

/**
 * Service for enhancing webinar duration data
 */
export class DurationService {
  
  /**
   * Enhance duration data for a specific webinar
   */
  static async enhanceWebinarDuration(webinarId: string): Promise<any> {
    console.log(`[DurationService] Enhancing duration for webinar: ${webinarId}`);
    
    const { data, error } = await supabase.functions.invoke('zoom-api', {
      body: { 
        action: 'enhance-duration',
        webinar_id: webinarId
      }
    });
    
    if (error) {
      console.error('[DurationService] Error enhancing duration:', error);
      throw new Error(error.message || 'Failed to enhance duration data');
    }
    
    if (data.error) {
      console.error('[DurationService] API error:', data.error);
      throw new Error(data.error);
    }
    
    console.log('[DurationService] Duration enhancement completed:', data);
    return data;
  }
  
  /**
   * Enhance duration data for all completed webinars missing duration
   */
  static async enhanceAllMissingDurations(): Promise<any> {
    console.log('[DurationService] Enhancing duration for all webinars missing duration data');
    
    const { data, error } = await supabase.functions.invoke('zoom-api', {
      body: { 
        action: 'enhance-duration'
      }
    });
    
    if (error) {
      console.error('[DurationService] Error enhancing durations:', error);
      throw new Error(error.message || 'Failed to enhance duration data');
    }
    
    if (data.error) {
      console.error('[DurationService] API error:', data.error);
      throw new Error(data.error);
    }
    
    console.log('[DurationService] Bulk duration enhancement completed:', data);
    return data;
  }
  
  /**
   * Check which webinars are missing duration data
   */
  static async checkMissingDurations(userId: string): Promise<any[]> {
    console.log('[DurationService] Checking for webinars missing duration data');
    
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select('webinar_id, topic, status, actual_duration, start_time')
      .eq('user_id', userId)
      .in('status', ['ended', 'stopped'])
      .is('actual_duration', null);
    
    if (error) {
      console.error('[DurationService] Error checking missing durations:', error);
      throw error;
    }
    
    console.log(`[DurationService] Found ${webinars?.length || 0} webinars missing duration data`);
    return webinars || [];
  }
}
