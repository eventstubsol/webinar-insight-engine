
export interface ZoomWebinar {
  id: string;
  uuid: string;
  topic: string;
  start_time: string;
  duration: number;
  timezone: string;
  agenda: string;
  host_email: string;
  status: string;
  type: number;
  registrants_count?: number;
  participants_count?: number;
  raw_data?: Record<string, any>;
  
  // Enhanced fields from WebinarDetails interface
  host_id?: string;
  join_url?: string;
  registration_url?: string;
  password?: string;
  start_url?: string;
  webinar_created_at?: string;
  is_simulive?: boolean;
  auto_recording_type?: string;
  approval_type?: number;
  registration_type?: number;
  contact_name?: string;
  contact_email?: string;
  enforce_login?: boolean;
  on_demand?: boolean;
  practice_session?: boolean;
  hd_video?: boolean;
  host_video?: boolean;
  panelists_video?: boolean;
  audio_type?: string;
  language?: string;
  
  // Settings object for complex configurations
  settings?: {
    host_video?: boolean;
    panelists_video?: boolean;
    practice_session?: boolean;
    hd_video?: boolean;
    approval_type?: number;
    registration_type?: number;
    audio?: string;
    auto_recording?: string;
    enforce_login?: boolean;
    enforce_login_domains?: string;
    alternative_hosts?: string;
    close_registration?: boolean;
    show_share_button?: boolean;
    allow_multiple_devices?: boolean;
    on_demand?: boolean;
    global_dial_in_countries?: string[];
    contact_name?: string;
    contact_email?: string;
    registrants_confirmation_email?: boolean;
    registrants_restrict_number?: number;
    notify_registrants?: boolean;
    post_webinar_survey?: boolean;
    survey_url?: string;
    registrants_email_notification?: boolean;
    meeting_authentication?: boolean;
    authentication_option?: string;
    authentication_domains?: string;
    authentication_name?: string;
    request_permission_to_unmute?: boolean;
    panelist_authentication?: boolean;
    add_watermark?: boolean;
    add_audio_watermark?: boolean;
  };
  
  // Recurrence information for recurring webinars
  recurrence?: {
    type?: number;
    repeat_interval?: number;
    weekly_days?: string;
    monthly_day?: number;
    monthly_week?: number;
    monthly_week_day?: number;
    end_times?: number;
    end_date_time?: string;
  };
  
  // Tracking fields for custom data collection
  tracking_fields?: Array<{
    field: string;
    value: string;
    visible: boolean;
  }>;
  
  // Occurrences for recurring webinars
  occurrences?: Array<{
    occurrence_id: string;
    start_time: string;
    duration: number;
    status: string;
  }>;
  
  [key: string]: any; // Allow additional properties for backward compatibility
}

export interface ZoomParticipants {
  registrants: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    create_time: string;
    join_url: string;
    status: string;
  }>;
  attendees: Array<{
    id: string;
    name: string;
    user_email: string;
    join_time: string;
    leave_time: string;
    duration: number;
  }>;
}

export interface ZoomCredentialsStatus {
  hasCredentials: boolean;
  isVerified: boolean;
  lastVerified: string | null;
}

// New interfaces for enhanced data structures
export interface ZoomWebinarOccurrence {
  id: string;
  user_id: string;
  workspace_id?: string;
  webinar_id: string;
  occurrence_id: string;
  start_time?: string;
  duration?: number;
  status?: string;
  raw_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ZoomWebinarTrackingField {
  id: string;
  user_id: string;
  workspace_id?: string;
  webinar_id: string;
  field_name: string;
  field_value?: string;
  is_visible: boolean;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface ZoomWebinarRecurrence {
  id: string;
  user_id: string;
  workspace_id?: string;
  webinar_id: string;
  recurrence_type?: number;
  repeat_interval?: number;
  weekly_days?: string;
  monthly_day?: number;
  monthly_week?: number;
  monthly_week_day?: number;
  end_times?: number;
  end_date_time?: string;
  raw_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}
