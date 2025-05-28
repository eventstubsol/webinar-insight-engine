
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch webinar recordings from API
 */
export async function fetchWebinarRecordingsAPI(webinarId: string): Promise<any> {
  console.log(`[fetchWebinarRecordingsAPI] Fetching recordings for webinar ID: ${webinarId}`);
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'get-webinar-recordings',
      webinar_id: webinarId
    }
  });
  
  if (error) {
    console.error('[fetchWebinarRecordingsAPI] Error:', error);
    throw error;
  }
  
  if (data.error) {
    console.error('[fetchWebinarRecordingsAPI] API returned error:', data.error);
    throw new Error(data.error);
  }
  
  console.log(`[fetchWebinarRecordingsAPI] Retrieved recordings data for webinar ${webinarId}`);
  return data;
}
