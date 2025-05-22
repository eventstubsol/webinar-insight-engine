
import { BaseZoomService } from './base/BaseZoomService';
import { supabase } from '@/integrations/supabase/client';

/**
 * QandAService - Service for managing Q&A data
 */
export class QandAService extends BaseZoomService {
  /**
   * Fetch webinar Q&A data for a specific webinar
   */
  static async fetchWebinarQAndA(userId: string, webinarId: string) {
    try {
      console.log(`[QandAService] Fetching Q&A for webinar ID: ${webinarId}`);
      
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
      console.error('[QandAService] Error fetching webinar Q&A:', error);
      throw error;
    }
  }
}
