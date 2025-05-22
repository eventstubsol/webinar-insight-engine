
import { BaseZoomService } from './base/BaseZoomService';
import { supabase } from '@/integrations/supabase/client';

/**
 * EngagementService - Service for managing engagement and chat data
 */
export class EngagementService extends BaseZoomService {
  /**
   * Fetch engagement metrics for a webinar
   */
  static async fetchWebinarEngagement(userId: string, webinarId: string) {
    try {
      console.log(`[EngagementService] Fetching engagement for webinar ID: ${webinarId}`);
      
      const { data, error } = await supabase
        .from('zoom_webinar_engagement')
        .select('*')
        .eq('user_id', userId)
        .eq('webinar_id', webinarId);
        
      if (error) throw error;
      
      return {
        engagement: data || [],
        totalEngagements: data?.length || 0
      };
    } catch (error) {
      console.error('[EngagementService] Error fetching webinar engagement:', error);
      throw error;
    }
  }

  /**
   * Fetch chat messages for a webinar
   */
  static async fetchWebinarChat(userId: string, webinarId: string) {
    try {
      console.log(`[EngagementService] Fetching chat for webinar ID: ${webinarId}`);
      
      const { data, error } = await supabase
        .from('zoom_webinar_chat')
        .select('*')
        .eq('user_id', userId)
        .eq('webinar_id', webinarId)
        .order('message_time', { ascending: true });
        
      if (error) throw error;
      
      return {
        messages: data || [],
        totalMessages: data?.length || 0
      };
    } catch (error) {
      console.error('[EngagementService] Error fetching webinar chat:', error);
      throw error;
    }
  }
}
