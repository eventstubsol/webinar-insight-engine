
import { ZoomWebinar, ZoomCredentialsStatus } from '@/hooks/zoom';

export interface WebinarErrorDetails {
  isMissingCredentials: boolean;
  isCapabilitiesError: boolean;
  isScopesError: boolean;
  missingSecrets: string[];
}

export interface WebinarSyncHistory {
  id: string;
  user_id: string;
  sync_type: string;
  items_updated: number;
  created_at: string;
}

export interface WebinarState {
  webinars: ZoomWebinar[];
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  errorDetails: WebinarErrorDetails;
  refreshWebinars: (force?: boolean) => Promise<void>;
  lastSyncTime: Date | null;
  credentialsStatus: ZoomCredentialsStatus | null;
  isVerifying: boolean;
  verified: boolean;
  scopesError: boolean; // Changed from string to boolean
  verificationDetails: ZoomCredentialsStatus | null;
  isFirstLoad: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showWizard: boolean;
  setShowWizard: (show: boolean) => void;
  viewMode: 'list' | 'grid';
  filterTab: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  setDateRange: (date: { from: Date | undefined; to: Date | undefined }) => void;
  handleSetupZoom: () => void;
  handleWizardComplete: () => Promise<void>;
  errorMessage: string | null; // Made nullable
  dismissErrorBanner: () => void;
  errorBannerDismissed: boolean;
}
