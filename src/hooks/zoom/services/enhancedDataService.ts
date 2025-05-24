
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch webinar occurrences from database
 */
export async function fetchWebinarOccurrences(userId: string, webinarId?: string): Promise<any[]> {
  console.log('[fetchWebinarOccurrences] Fetching webinar occurrences from database');
  
  let query = supabase
    .from('zoom_webinar_occurrences')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });
    
  if (webinarId) {
    query = query.eq('webinar_id', webinarId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[fetchWebinarOccurrences] Error:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Fetch webinar tracking fields from database
 */
export async function fetchWebinarTrackingFields(userId: string, webinarId?: string): Promise<any[]> {
  console.log('[fetchWebinarTrackingFields] Fetching webinar tracking fields from database');
  
  let query = supabase
    .from('zoom_webinar_tracking_fields')
    .select('*')
    .eq('user_id', userId);
    
  if (webinarId) {
    query = query.eq('webinar_id', webinarId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[fetchWebinarTrackingFields] Error:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Fetch webinar recurrence data from database
 */
export async function fetchWebinarRecurrence(userId: string, webinarId?: string): Promise<any[]> {
  console.log('[fetchWebinarRecurrence] Fetching webinar recurrence data from database');
  
  let query = supabase
    .from('zoom_webinar_recurrence')
    .select('*')
    .eq('user_id', userId);
    
  if (webinarId) {
    query = query.eq('webinar_id', webinarId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[fetchWebinarRecurrence] Error:', error);
    return [];
  }
  
  return data || [];
}
