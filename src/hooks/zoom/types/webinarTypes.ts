
import { ZoomWebinar } from '../types';

export interface WebinarErrorDetails {
  isMissingCredentials: boolean;
  isCapabilitiesError: boolean;
  isScopesError: boolean;
  missingSecrets: string[];
}

export interface SyncHistoryItem {
  id: string;
  created_at: string;
  sync_type: string;
  status: string;
  items_synced: number;
  message?: string;
}

export interface UseZoomWebinarsResult {
  webinars: ZoomWebinar[];
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  errorDetails: WebinarErrorDetails;
  refreshWebinars: (force?: boolean) => Promise<void>;
  updateParticipantData: () => Promise<void>;
  syncHistory: SyncHistoryItem[];
  lastSyncTime: Date | null;
  credentialsStatus: any;
}

export interface ZoomWebinarInstance {
  id: string;
  instance_id: string;
  webinar_id: string;
  webinar_uuid: string;
  topic: string;
  start_time: string | null;
  end_time: string | null;
  duration: number | null;
  status: string | null;
  participants_count: number;
  registrants_count: number;
  raw_data: Record<string, any>;
}
