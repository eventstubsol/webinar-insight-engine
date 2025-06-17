
import { supabase } from '@/integrations/supabase/client';
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
 * IMPROVED: Fetch participants from database with proper filtering and counting
 */
export async function fetchParticipantsFromDatabase(userId: string, webinarId?: string): Promise<{ registrants: any[], attendees: any[], totalCount: number } | null> {
  console.log(`[fetchParticipantsFromDatabase] Fetching participants from database for user: ${userId}${webinarId ? `, webinar: ${webinarId}` : ''}`);
  
  let query = supabase
    .from('zoom_webinar_participants')
    .select('*')
    .eq('user_id', userId);
    
  if (webinarId) {
    query = query.eq('webinar_id', webinarId);
  }
  
  const { data: dbParticipants, error: dbError, count } = await query;
  
  if (dbError) {
    console.error('[fetchParticipantsFromDatabase] Error:', dbError);
    return null;
  }
  
  if (!dbParticipants || dbParticipants.length === 0) {
    console.log('[fetchParticipantsFromDatabase] No participants found in database');
    return { registrants: [], attendees: [], totalCount: 0 };
  }
  
  console.log(`[fetchParticipantsFromDatabase] Found ${dbParticipants.length} participants in database (total count: ${count})`);
  
  // Separate registrants and attendees
  const registrants = dbParticipants
    .filter(p => p.participant_type === 'registrant')
    .map(p => p.raw_data || {
      id: p.participant_id,
      email: p.email,
      name: p.name,
      join_time: p.join_time
    });
  
  const attendees = dbParticipants
    .filter(p => p.participant_type === 'attendee')
    .map(p => p.raw_data || {
      id: p.participant_id,
      email: p.email,
      name: p.name,
      join_time: p.join_time,
      leave_time: p.leave_time,
      duration: p.duration
    });
  
  console.log(`[fetchParticipantsFromDatabase] Separated: ${registrants.length} registrants, ${attendees.length} attendees`);
  
  return { 
    registrants, 
    attendees,
    totalCount: count || dbParticipants.length
  };
}

/**
 * Transform database webinars to ZoomWebinar format
 */
function transformDatabaseWebinars(dbWebinars: any[]): ZoomWebinar[] {
  return dbWebinars.map(item => {
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
      
      host_id: item.host_id,
      host_name: item.host_name,
      host_first_name: item.host_first_name,
      host_last_name: item.host_last_name,
      
      actual_start_time: item.actual_start_time,
      actual_duration: item.actual_duration,
      
      join_url: item.join_url,
      registration_url: item.registration_url,
      start_url: item.start_url,
      password: item.password,
      
      h323_password: item.h323_password,
      pstn_password: item.pstn_password,
      encrypted_password: item.encrypted_password,
      
      is_simulive: item.is_simulive,
      webinar_created_at: item.webinar_created_at,
      
      settings: item.settings,
      tracking_fields: item.tracking_fields,
      recurrence: item.recurrence,
      occurrences: item.occurrences,
      
      approval_type: item.approval_type,
      registration_type: item.registration_type,
      auto_recording_type: item.auto_recording_type,
      enforce_login: item.enforce_login,
      on_demand: item.on_demand,
      practice_session: item.practice_session,
      hd_video: item.hd_video,
      host_video: item.host_video,
      panelists_video: item.panelists_video,
      audio_type: item.audio_type,
      language: item.language,
      contact_name: item.contact_name,
      contact_email: item.contact_email,
      
      // FIXED: Use database counts, not raw_data counts
      registrants_count: item.registrants_count || 0,
      participants_count: item.participants_count || 0,
      
      raw_data: parsedRawData
    };
    
    return webinar;
  });
}
