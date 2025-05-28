
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
  
  // Host information
  host_id?: string;
  host_name?: string;
  host_first_name?: string;
  host_last_name?: string;
  
  // Actual timing data
  actual_start_time?: string;
  actual_duration?: number;
  
  // URLs
  join_url?: string;
  registration_url?: string;
  start_url?: string;
  password?: string;
  
  // Configuration
  is_simulive?: boolean;
  webinar_created_at?: string;
  
  // Settings
  approval_type?: number;
  registration_type?: number;
  auto_recording_type?: string;
  enforce_login?: boolean;
  on_demand?: boolean;
  practice_session?: boolean;
  hd_video?: boolean;
  host_video?: boolean;
  panelists_video?: boolean;
  audio_type?: string;
  language?: string;
  contact_name?: string;
  contact_email?: string;
  
  raw_data?: Record<string, any>;
  [key: string]: any; // Allow additional properties
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
