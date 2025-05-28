
/**
 * FIXED: TypeScript interfaces aligned with actual Zoom API responses
 * Separated by data source to avoid confusion
 */

// Basic webinar data from /users/{userId}/webinars endpoint
export interface ZoomWebinarBasic {
  id: string;
  uuid?: string;
  topic: string;
  start_time?: string;
  duration?: number;
  timezone?: string;
  agenda?: string;
  host_email?: string;
  status?: string;
  type?: number;
  
  // Host information (basic)
  host_id?: string;
  
  // URLs (if available in basic response)
  join_url?: string;
  registration_url?: string;
  start_url?: string;
  password?: string;
  
  // Basic settings (not nested)
  approval_type?: number;
  registration_type?: number;
  auto_recording?: string;
  audio?: string;
  language?: string;
  
  // Boolean flags
  is_simulive?: boolean;
  enforce_login?: boolean;
  on_demand?: boolean;
  practice_session?: boolean;
  hd_video?: boolean;
  host_video?: boolean;
  panelists_video?: boolean;
  
  // Metadata
  created_at?: string;
  raw_data?: Record<string, any>;
}

// Enhanced webinar data with past webinar information
export interface ZoomWebinarEnhanced extends ZoomWebinarBasic {
  // Actual timing data from past_webinars API
  actual_start_time?: string;
  actual_duration?: number;
  actual_end_time?: string;
  participants_count?: number;
  
  // Enhancement metadata
  _enhanced_with_past_data?: boolean;
  _past_data_source?: string;
  _completion_analysis?: {
    isCompleted: boolean;
    reason: string;
    confidenceLevel: 'high' | 'medium' | 'low';
    shouldFetchActualData: boolean;
  };
}

// Main interface for webinar data (used throughout the app)
export interface ZoomWebinar extends ZoomWebinarEnhanced {
  // Additional computed fields
  registrants_count?: number;
  
  // Host information (extended)
  host_name?: string;
  host_first_name?: string;
  host_last_name?: string;
  
  // Extended configuration
  webinar_created_at?: string;
  contact_name?: string;
  contact_email?: string;
  
  // Internal tracking
  [key: string]: any; // Allow additional properties for backward compatibility
}

// Participant data structures
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

// API Response validation helpers
export function validateBasicWebinar(data: any): ZoomWebinarBasic | null {
  if (!data || typeof data.id !== 'string') {
    return null;
  }
  
  return {
    id: data.id,
    uuid: data.uuid ?? undefined,
    topic: data.topic ?? 'Untitled Webinar',
    start_time: data.start_time ?? undefined,
    duration: data.duration ?? undefined,
    timezone: data.timezone ?? undefined,
    agenda: data.agenda ?? undefined,
    host_email: data.host_email ?? undefined,
    status: data.status ?? undefined,
    type: data.type ?? undefined,
    host_id: data.host_id ?? undefined,
    join_url: data.join_url ?? undefined,
    registration_url: data.registration_url ?? undefined,
    start_url: data.start_url ?? undefined,
    password: data.password ?? undefined,
    approval_type: data.approval_type ?? undefined,
    registration_type: data.registration_type ?? undefined,
    auto_recording: data.auto_recording ?? undefined,
    audio: data.audio ?? undefined,
    language: data.language ?? undefined,
    is_simulive: data.is_simulive === true,
    enforce_login: data.enforce_login === true,
    on_demand: data.on_demand === true,
    practice_session: data.practice_session === true,
    hd_video: data.hd_video === true,
    host_video: data.host_video !== false,
    panelists_video: data.panelists_video !== false,
    created_at: data.created_at ?? undefined,
    raw_data: data
  };
}

export function validatePastWebinarData(data: any): Partial<ZoomWebinarEnhanced> | null {
  if (!data) {
    return null;
  }
  
  return {
    actual_start_time: data.start_time ?? undefined,
    actual_duration: data.duration ?? undefined,
    actual_end_time: data.end_time ?? undefined,
    participants_count: data.participants_count ?? undefined
  };
}
