
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
