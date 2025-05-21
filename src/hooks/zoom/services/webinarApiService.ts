import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ZoomWebinar } from '../types';

/**
 * Fetch webinars from database with date range filtering
 */
export async function fetchWebinarsFromDatabase(
  userId: string, 
  startDate?: Date | string, 
  endDate?: Date | string
): Promise<ZoomWebinar[] | null> {
  console.log('[fetchWebinarsFromDatabase] Fetching webinars from database with date filtering');
  
  let query = supabase
    .from('zoom_webinars')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });
  
  // Apply date range filtering if provided
  if (startDate) {
    const formattedStartDate = typeof startDate === 'string' ? startDate : startDate.toISOString();
    query = query.gte('start_time', formattedStartDate);
    console.log(`[fetchWebinarsFromDatabase] Filtering webinars after: ${formattedStartDate}`);
  }
  
  if (endDate) {
    const formattedEndDate = typeof endDate === 'string' ? endDate : endDate.toISOString();
    query = query.lte('start_time', formattedEndDate);
    console.log(`[fetchWebinarsFromDatabase] Filtering webinars before: ${formattedEndDate}`);
  }
  
  const { data: dbWebinars, error: dbError } = await query;
  
  if (dbError) {
    console.error('[fetchWebinarsFromDatabase] Error:', dbError);
    return null;
  }
  
  if (!dbWebinars || dbWebinars.length === 0) {
    console.log('[fetchWebinarsFromDatabase] No webinars found in database with date range filter');
    return [];
  }
  
  console.log(`[fetchWebinarsFromDatabase] Found ${dbWebinars.length} webinars in database with date range filter`);
  
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
 * Transform database webinars to ZoomWebinar format
 */
function transformDatabaseWebinars(dbWebinars: any[]): ZoomWebinar[] {
  // Transform to ZoomWebinar format with proper type handling
  return dbWebinars.map(item => {
    // Parse the raw_data if it's a string, use as-is if it's already an object
    let parsedRawData: Record<string, any> = {};
    
    if (item.raw_data) {
      if (typeof item.raw_data === 'string') {
        try {
          parsedRawData = JSON.parse(item.raw_data);
        } catch (e) {
          console.error('Failed to parse raw_data:', e);
        }
      } else {
        // Assume it's already an object
        parsedRawData = item.raw_data as Record<string, any>;
      }
    }
    
    // Create a properly typed ZoomWebinar object
    const webinar: ZoomWebinar = {
      id: item.webinar_id,
      uuid: item.webinar_uuid,
      topic: item.topic,
      start_time: item.start_time,
      duration: item.duration,
      timezone: item.timezone,
      agenda: item.agenda || '',
      host_email: item.host_email,
      status: item.status,
      type: item.type,
      registrants_count: parsedRawData?.registrants_count || 0,
      participants_count: parsedRawData?.participants_count || 0,
      raw_data: parsedRawData
    };
    
    return webinar;
  });
}

/**
 * Fetch webinars from API with date range filtering
 */
export async function fetchWebinarsFromAPI(
  forceSync: boolean = false,
  startDate?: Date | string,
  endDate?: Date | string,
  batchSize: number = 2
): Promise<ZoomWebinar[]> {
  console.log(`[fetchWebinarsFromAPI] Fetching webinars from API with force_sync=${forceSync}, date range filtering, and batch size ${batchSize}`);
  
  // Convert dates to ISO strings if they're Date objects
  const startDateStr = startDate ? (typeof startDate === 'string' ? startDate : startDate.toISOString()) : undefined;
  const endDateStr = endDate ? (typeof endDate === 'string' ? endDate : endDate.toISOString()) : undefined;
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'list-webinars',
      force_sync: forceSync,
      start_date: startDateStr,
      end_date: endDateStr,
      batch_size: batchSize
    }
  });
  
  if (error) {
    console.error('[fetchWebinarsFromAPI] Function invocation error:', error);
    throw new Error(error.message || 'Failed to invoke Zoom API function');
  }
  
  if (data.error) {
    console.error('[fetchWebinarsFromAPI] API error:', data.error);
    throw new Error(data.error);
  }
  
  return data.webinars || [];
}

/**
 * Refresh webinars from API with force option and date filtering
 */
export async function refreshWebinarsFromAPI(
  userId: string, 
  force: boolean = false,
  startDate?: Date | string,
  endDate?: Date | string,
  batchSize: number = 2
): Promise<any> {
  console.log(`[refreshWebinarsFromAPI] Starting refresh with force=${force} and date filtering`);
  
  // Convert dates to ISO strings if they're Date objects
  const startDateStr = startDate ? (typeof startDate === 'string' ? startDate : startDate.toISOString()) : undefined;
  const endDateStr = endDate ? (typeof endDate === 'string' ? endDate : endDate.toISOString()) : undefined;
  
  // Make the API call to fetch fresh data from Zoom
  const { data: refreshData, error: refreshError } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'list-webinars',
      force_sync: force,
      start_date: startDateStr,
      end_date: endDateStr,
      batch_size: batchSize
    }
  });
  
  if (refreshError) {
    console.error('[refreshWebinarsFromAPI] Error during refresh:', refreshError);
    throw refreshError;
  }
  
  if (refreshData.error) {
    console.error('[refreshWebinarsFromAPI] API returned error:', refreshData.error);
    throw new Error(refreshData.error);
  }
  
  console.log('[refreshWebinarsFromAPI] Sync completed successfully:', refreshData);
  
  return refreshData;
}

/**
 * Update participant data for webinars
 */
export async function updateParticipantDataAPI(): Promise<any> {
  console.log('[updateParticipantDataAPI] Updating participant data');
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'update-webinar-participants'
    }
  });
  
  if (error) {
    console.error('[updateParticipantDataAPI] Error:', error);
    throw error;
  }
  
  console.log('[updateParticipantDataAPI] Update completed:', data);
  return data;
}

/**
 * Fetch webinar instances from API
 */
export async function fetchWebinarInstancesAPI(webinarId: string): Promise<any> {
  console.log(`[fetchWebinarInstancesAPI] Fetching instances for webinar ID: ${webinarId}`);
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'get-webinar-instances',
      webinar_id: webinarId
    }
  });
  
  if (error) {
    console.error('[fetchWebinarInstancesAPI] Error:', error);
    throw error;
  }
  
  console.log(`[fetchWebinarInstancesAPI] Retrieved ${data.instances?.length || 0} instances`);
  return data.instances || [];
}

/**
 * Fetch instance participants from API
 */
export async function fetchInstanceParticipantsAPI(webinarId: string, instanceId: string): Promise<any> {
  console.log(`[fetchInstanceParticipantsAPI] Fetching participants for webinar ID: ${webinarId}, instance ID: ${instanceId}`);
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'get-instance-participants',
      webinar_id: webinarId,
      instance_id: instanceId
    }
  });
  
  if (error) {
    console.error('[fetchInstanceParticipantsAPI] Error:', error);
    throw error;
  }
  
  return {
    registrants: data.registrants || [],
    attendees: data.attendees || []
  };
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
