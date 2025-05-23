// Export interfaces for Zoom API types

export interface ZoomCredentialsStatus {
  hasCredentials: boolean;
  isVerified: boolean;
  lastVerified: string | null;
}

export interface ZoomCredentials {
  account_id: string;
  client_id: string;
  client_secret: string;
}

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
