
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ZoomWebinar } from '../types';

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
 * Transform database webinars to ZoomWebinar format with enhanced data extraction
 */
function transformDatabaseWebinars(dbWebinars: any[]): ZoomWebinar[] {
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
        parsedRawData = item.raw_data as Record<string, any>;
      }
    }
    
    // Extract settings from raw_data or individual columns
    const settings = parsedRawData.settings || {
      host_video: item.host_video ?? parsedRawData.host_video,
      panelists_video: item.panelists_video ?? parsedRawData.panelists_video,
      practice_session: item.practice_session ?? parsedRawData.practice_session,
      hd_video: item.hd_video ?? parsedRawData.hd_video,
      approval_type: item.approval_type ?? parsedRawData.approval_type,
      registration_type: item.registration_type ?? parsedRawData.registration_type,
      audio: item.audio_type ?? parsedRawData.audio,
      auto_recording: item.auto_recording_type ?? parsedRawData.auto_recording,
      enforce_login: item.enforce_login ?? parsedRawData.enforce_login,
      on_demand: item.on_demand ?? parsedRawData.on_demand,
      contact_name: item.contact_name ?? parsedRawData.contact_name,
      contact_email: item.contact_email ?? parsedRawData.contact_email,
      language: item.language ?? parsedRawData.language,
      // Additional settings from raw_data
      ...extractAdditionalSettings(parsedRawData)
    };
    
    // Extract recurrence information
    const recurrence = parsedRawData.recurrence;
    
    // Extract tracking fields
    const tracking_fields = parsedRawData.tracking_fields;
    
    // Extract occurrences for recurring webinars
    const occurrences = parsedRawData.occurrences;
    
    // Create a properly typed ZoomWebinar object with enhanced data
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
      raw_data: parsedRawData,
      
      // Enhanced fields from new columns
      host_id: item.host_id ?? parsedRawData.host_id,
      join_url: item.join_url ?? parsedRawData.join_url,
      registration_url: item.registration_url ?? parsedRawData.registration_url,
      password: item.password ?? parsedRawData.password,
      start_url: item.start_url ?? parsedRawData.start_url,
      webinar_created_at: item.webinar_created_at ?? parsedRawData.created_at,
      is_simulive: item.is_simulive ?? parsedRawData.is_simulive ?? false,
      auto_recording_type: item.auto_recording_type ?? parsedRawData.auto_recording,
      approval_type: item.approval_type ?? parsedRawData.approval_type,
      registration_type: item.registration_type ?? parsedRawData.registration_type,
      contact_name: item.contact_name ?? parsedRawData.contact_name,
      contact_email: item.contact_email ?? parsedRawData.contact_email,
      enforce_login: item.enforce_login ?? parsedRawData.enforce_login ?? false,
      on_demand: item.on_demand ?? parsedRawData.on_demand ?? false,
      practice_session: item.practice_session ?? parsedRawData.practice_session ?? false,
      hd_video: item.hd_video ?? parsedRawData.hd_video ?? false,
      host_video: item.host_video ?? parsedRawData.host_video ?? true,
      panelists_video: item.panelists_video ?? parsedRawData.panelists_video ?? true,
      audio_type: item.audio_type ?? parsedRawData.audio ?? 'both',
      language: item.language ?? parsedRawData.language ?? 'en-US',
      
      // Complex objects
      settings,
      recurrence,
      tracking_fields,
      occurrences
    };
    
    return webinar;
  });
}

/**
 * Extract additional settings from raw_data that aren't in dedicated columns
 */
function extractAdditionalSettings(rawData: Record<string, any>): Record<string, any> {
  const settings = rawData.settings || {};
  
  return {
    alternative_hosts: settings.alternative_hosts,
    close_registration: settings.close_registration,
    show_share_button: settings.show_share_button,
    allow_multiple_devices: settings.allow_multiple_devices,
    global_dial_in_countries: settings.global_dial_in_countries,
    registrants_confirmation_email: settings.registrants_confirmation_email,
    registrants_restrict_number: settings.registrants_restrict_number,
    notify_registrants: settings.notify_registrants,
    post_webinar_survey: settings.post_webinar_survey,
    survey_url: settings.survey_url,
    registrants_email_notification: settings.registrants_email_notification,
    meeting_authentication: settings.meeting_authentication,
    authentication_option: settings.authentication_option,
    authentication_domains: settings.authentication_domains,
    authentication_name: settings.authentication_name,
    request_permission_to_unmute: settings.request_permission_to_unmute,
    panelist_authentication: settings.panelist_authentication,
    add_watermark: settings.add_watermark,
    add_audio_watermark: settings.add_audio_watermark,
    enforce_login_domains: settings.enforce_login_domains
  };
}

/**
 * Fetch webinars from API
 */
export async function fetchWebinarsFromAPI(forceSync: boolean = false): Promise<ZoomWebinar[]> {
  console.log(`[fetchWebinarsFromAPI] Fetching webinars from API with force_sync=${forceSync}`);
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'list-webinars',
      force_sync: forceSync 
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
 * Refresh webinars from API with force option
 */
export async function refreshWebinarsFromAPI(userId: string, force: boolean = false): Promise<any> {
  console.log(`[refreshWebinarsFromAPI] Starting refresh with force=${force}`);
  
  // Make the API call to fetch fresh data from Zoom
  const { data: refreshData, error: refreshError } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'list-webinars',
      force_sync: force 
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
