
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
  
  // Password fields
  h323_password?: string;
  pstn_password?: string;
  encrypted_password?: string;
  
  // Configuration
  is_simulive?: boolean;
  webinar_created_at?: string;
  
  // Settings and configuration (new jsonb fields)
  settings?: Record<string, any>;
  tracking_fields?: Record<string, any>;
  recurrence?: Record<string, any>;
  occurrences?: Record<string, any>;
  
  // Settings (individual fields)
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
    // New registrant fields
    job_title?: string;
    purchasing_time_frame?: string;
    role_in_purchase_process?: string;
    no_of_employees?: string;
    industry?: string;
    org?: string;
    language?: string;
  }>;
  attendees: Array<{
    id: string;
    name: string;
    user_email: string;
    join_time: string;
    leave_time: string;
    duration: number;
    // New participant fields
    connection_type?: string;
    data_center?: string;
    pc_name?: string;
    domain?: string;
    mac_addr?: string;
    harddisk_id?: string;
    recording_consent?: boolean;
  }>;
}

// New interfaces for the new tables
export interface ZoomPanelist {
  id: string;
  user_id: string;
  webinar_id: string;
  panelist_id?: string;
  panelist_email?: string;
  name?: string;
  join_url?: string;
  raw_data?: Record<string, any>;
  workspace_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ZoomChatMessage {
  id: string;
  user_id: string;
  webinar_id: string;
  instance_id?: string;
  sender_name?: string;
  sender_email?: string;
  message: string;
  sent_at?: string;
  raw_data?: Record<string, any>;
  workspace_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ZoomWebinarTracking {
  id: string;
  user_id: string;
  webinar_id: string;
  source_name?: string;
  tracking_url?: string;
  visitor_count?: number;
  registration_count?: number;
  raw_data?: Record<string, any>;
  workspace_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ZoomCredentialsStatus {
  hasCredentials: boolean;
  isVerified: boolean;
  lastVerified: string | null;
}
