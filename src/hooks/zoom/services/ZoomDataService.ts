
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * ZoomDataService - Service for fetching and managing Zoom webinar data
 * This service handles all the additional data types like Q&A, polls, 
 * recordings, etc.
 */
export class ZoomDataService {
  
  /**
   * Fetch webinar Q&A data for a specific webinar
   */
  static async fetchWebinarQAndA(userId: string, webinarId: string) {
    try {
      console.log(`[ZoomDataService] Fetching Q&A for webinar ID: ${webinarId}`);
      
      const { data, error } = await supabase
        .from('zoom_webinar_questions')
        .select('*')
        .eq('user_id', userId)
        .eq('webinar_id', webinarId)
        .order('question_time', { ascending: false });
        
      if (error) throw error;
      
      return {
        questions: data || [],
        totalQuestions: data?.length || 0,
        answeredQuestions: data?.filter(q => q.answered)?.length || 0
      };
    } catch (error) {
      console.error('[ZoomDataService] Error fetching webinar Q&A:', error);
      throw error;
    }
  }
  
  /**
   * Fetch webinar poll data for a specific webinar
   */
  static async fetchWebinarPolls(userId: string, webinarId: string) {
    try {
      console.log(`[ZoomDataService] Fetching polls for webinar ID: ${webinarId}`);
      
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
      console.error('[ZoomDataService] Error fetching webinar polls:', error);
      throw error;
    }
  }
  
  /**
   * Fetch poll responses for a specific poll
   */
  static async fetchPollResponses(userId: string, pollId: string) {
    try {
      console.log(`[ZoomDataService] Fetching responses for poll ID: ${pollId}`);
      
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
      console.error('[ZoomDataService] Error fetching poll responses:', error);
      throw error;
    }
  }
  
  /**
   * Fetch webinar recording data for a specific webinar
   */
  static async fetchWebinarRecordings(userId: string, webinarId: string) {
    try {
      console.log(`[ZoomDataService] Fetching recordings for webinar ID: ${webinarId}`);
      
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
      console.error('[ZoomDataService] Error fetching webinar recordings:', error);
      throw error;
    }
  }

  /**
   * Fetch engagement metrics for a webinar
   */
  static async fetchWebinarEngagement(userId: string, webinarId: string) {
    try {
      console.log(`[ZoomDataService] Fetching engagement for webinar ID: ${webinarId}`);
      
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
      console.error('[ZoomDataService] Error fetching webinar engagement:', error);
      throw error;
    }
  }

  /**
   * Fetch chat messages for a webinar
   */
  static async fetchWebinarChat(userId: string, webinarId: string) {
    try {
      console.log(`[ZoomDataService] Fetching chat for webinar ID: ${webinarId}`);
      
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
      console.error('[ZoomDataService] Error fetching webinar chat:', error);
      throw error;
    }
  }
  
  /**
   * Trigger a full data sync for a webinar to fetch all available data
   */
  static async syncAllWebinarData(userId: string, webinarId: string) {
    try {
      console.log(`[ZoomDataService] Starting full data sync for webinar ID: ${webinarId}`);
      
      // Call the Zoom API edge function to fetch all additional data
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'get-webinar-extended-data',
          webinar_id: webinarId
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Data sync completed",
        description: "All webinar data has been synchronized"
      });
      
      return data;
    } catch (error) {
      console.error('[ZoomDataService] Error syncing webinar data:', error);
      toast({
        title: "Data sync failed",
        description: "Could not synchronize webinar data",
        variant: "destructive"
      });
      throw error;
    }
  }
}
