
import { ZoomWebinar } from '../types';

/**
 * Transform database webinars to ZoomWebinar format with enhanced data extraction
 */
export function transformDatabaseWebinars(dbWebinars: any[]): ZoomWebinar[] {
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
    
    // Extract participant counts with multiple fallback sources
    const registrantsCount = parsedRawData?.registrants_count || 
                           item.registrants_count || 
                           parsedRawData?.detailed_data?.registrants_count || 
                           0;
                           
    const participantsCount = parsedRawData?.participants_count || 
                            item.participants_count || 
                            parsedRawData?.detailed_data?.participants_count || 
                            0;
    
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
      registrants_count: registrantsCount,
      participants_count: participantsCount,
      raw_data: {
        ...parsedRawData,
        // Ensure these are always available at the top level for easy access
        registrants_count: registrantsCount,
        participants_count: participantsCount
      },
      
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
