
import { BaseZoomService } from './base/BaseZoomService';
import { supabase } from '@/integrations/supabase/client';

/**
 * PollsService - Service for managing polls data
 */
export class PollsService extends BaseZoomService {
  /**
   * Fetch webinar poll data for a specific webinar
   */
  static async fetchWebinarPolls(userId: string, webinarId: string) {
    try {
      console.log(`[PollsService] Fetching polls for webinar ID: ${webinarId}`);
      
      const { data, error } = await supabase
        .from('zoom_webinar_polls')
        .select('*')
        .eq('user_id', userId)
        .eq('webinar_id', webinarId)
        .order('start_time', { ascending: false });
        
      if (error) throw error;
      
      return {
        polls: data || [],
        totalPolls: data?.length || 0,
        totalParticipants: data?.reduce((acc, poll) => acc + (poll.total_participants || 0), 0) || 0
      };
    } catch (error) {
      console.error('[PollsService] Error fetching webinar polls:', error);
      throw error;
    }
  }
  
  /**
   * Fetch poll responses for a specific poll
   */
  static async fetchPollResponses(userId: string, pollId: string) {
    try {
      console.log(`[PollsService] Fetching responses for poll ID: ${pollId}`);
      
      const { data, error } = await supabase
        .from('zoom_webinar_poll_responses')
        .select('*')
        .eq('user_id', userId)
        .eq('poll_id', pollId);
        
      if (error) throw error;
      
      return {
        responses: data || [],
        totalResponses: data?.length || 0
      };
    } catch (error) {
      console.error('[PollsService] Error fetching poll responses:', error);
      throw error;
    }
  }
}
