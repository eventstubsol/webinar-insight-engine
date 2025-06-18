
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
 * UPDATED: Fetch participants from separate tables
 */
export async function fetchParticipantsFromDatabase(userId: string, webinarId?: string): Promise<{ registrants: any[], attendees: any[], totalCount: number } | null> {
  console.log(`[fetchParticipantsFromDatabase] Fetching participants from separate tables for user: ${userId}${webinarId ? `, webinar: ${webinarId}` : ''}`);
  
  // Fetch registrants from zoom_webinar_registrants table
  let registrantsQuery = supabase
    .from('zoom_webinar_registrants')
    .select('*')
    .eq('user_id', userId);
    
  if (webinarId) {
    registrantsQuery = registrantsQuery.eq('webinar_id', webinarId);
  }
  
  // Fetch attendees from zoom_webinar_participants table
  let attendeesQuery = supabase
    .from('zoom_webinar_participants')
    .select('*')
    .eq('user_id', userId);
    
  if (webinarId) {
    attendeesQuery = attendeesQuery.eq('webinar_id', webinarId);
  }
  
  const [registrantsResult, attendeesResult] = await Promise.all([
    registrantsQuery,
    attendeesQuery
  ]);
  
  if (registrantsResult.error) {
    console.error('[fetchParticipantsFromDatabase] Registrants error:', registrantsResult.error);
    return null;
  }
  
  if (attendeesResult.error) {
    console.error('[fetchParticipantsFromDatabase] Attendees error:', attendeesResult.error);
    return null;
  }
  
  const dbRegistrants = registrantsResult.data || [];
  const dbAttendees = attendeesResult.data || [];
  
  if (dbRegistrants.length === 0 && dbAttendees.length === 0) {
    console.log('[fetchParticipantsFromDatabase] No participants found in database');
    return { registrants: [], attendees: [], totalCount: 0 };
  }
  
  console.log(`[fetchParticipantsFromDatabase] Found ${dbRegistrants.length} registrants and ${dbAttendees.length} attendees in database`);
  
  // Transform registrants data
  const registrants = dbRegistrants.map(r => r.raw_data || {
    id: r.registrant_id,
    email: r.email,
    first_name: r.first_name,
    last_name: r.last_name,
    create_time: r.registration_time,
    status: r.status,
    join_url: r.join_url
  });
  
  // Transform attendees data
  const attendees = dbAttendees.map(a => a.raw_data || {
    id: a.participant_id,
    email: a.email,
    name: a.name,
    join_time: a.join_time,
    leave_time: a.leave_time,
    duration: a.duration
  });
  
  console.log(`[fetchParticipantsFromDatabase] Transformed: ${registrants.length} registrants, ${attendees.length} attendees`);
  
  return { 
    registrants, 
    attendees,
    totalCount: dbRegistrants.length + dbAttendees.length
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
      
      // Use database counts from the correct tables
      registrants_count: item.registrants_count || 0,
      participants_count: item.participants_count || 0,
      
      raw_data: parsedRawData
    };
    
    return webinar;
  });
}
