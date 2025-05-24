
import { supabase } from '@/integrations/supabase/client';
import { ZoomWebinar } from '../types';
import { transformDatabaseWebinars } from './transformationService';

/**
 * Fetch webinars from database
 */
export async function fetchWebinarsFromDatabase(userId: string): Promise<ZoomWebinar[] | null> {
  console.log('[fetchWebinarsFromDatabase] Fetching webinars from database');
  
  const { data: dbWebinars, error: dbError } = await supabase
    .from('zoom_webinars')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });
  
  if (dbError) {
    console.error('[fetchWebinarsFromDatabase] Error:', dbError);
    return null;
  }
  
  if (!dbWebinars || dbWebinars.length === 0) {
    console.log('[fetchWebinarsFromDatabase] No webinars found in database');
    return [];
  }
  
  console.log(`[fetchWebinarsFromDatabase] Found ${dbWebinars.length} webinars in database`);
  
  return transformDatabaseWebinars(dbWebinars);
}

/**
 * Fetch webinar instances from database
 */
export async function fetchWebinarInstancesFromDatabase(userId: string, webinarId?: string): Promise<any[] | null> {
  console.log('[fetchWebinarInstancesFromDatabase] Fetching webinar instances from database');
  
  let query = supabase
    .from('zoom_webinar_instances')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });
    
  // If a specific webinar ID is provided, filter for just that webinar
  if (webinarId) {
    query = query.eq('webinar_id', webinarId);
  }
  
  const { data: dbInstances, error: dbError } = await query;
  
  if (dbError) {
    console.error('[fetchWebinarInstancesFromDatabase] Error:', dbError);
    return null;
  }
  
  if (!dbInstances || dbInstances.length === 0) {
    console.log('[fetchWebinarInstancesFromDatabase] No webinar instances found in database');
    return [];
  }
  
  console.log(`[fetchWebinarInstancesFromDatabase] Found ${dbInstances.length} webinar instances in database`);
  
  return dbInstances;
}

/**
 * Fetch sync history
 */
export async function fetchSyncHistory(userId: string): Promise<any[]> {
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
