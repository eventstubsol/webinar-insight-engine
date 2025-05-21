
import React, { createContext, useContext, ReactNode } from 'react';
import { ZoomWebinar, ZoomCredentialsStatus } from '@/hooks/zoom';

type ViewMode = 'list' | 'grid';
type FilterTab = 'all' | 'upcoming' | 'past' | 'drafts' | string;

// Define the context shape
export interface WebinarContextState {
  webinars: ZoomWebinar[];
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  errorDetails: {
    isMissingCredentials: boolean;
    isCapabilitiesError: boolean;
    isScopesError: boolean;
    missingSecrets: string[];
  };
  refreshWebinars: (force?: boolean) => Promise<void>;
  lastSyncTime: Date | null;
  credentialsStatus: ZoomCredentialsStatus | null;
  isVerifying: boolean;
  verified: boolean;
  scopesError: boolean;
  verificationDetails: ZoomCredentialsStatus | null;
  isFirstLoad: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showWizard: boolean;
  setShowWizard: (show: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  filterTab: FilterTab;
  setFilterTab: (tab: FilterTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateFilter: Date | undefined;
  setDateFilter: (date: Date | undefined) => void;
  handleSetupZoom: () => void;
  handleWizardComplete: () => Promise<void>;
  errorMessage: string;
  dismissErrorBanner: () => void;
  errorBannerDismissed: boolean;
}

// Create the context with default values
const WebinarContext = createContext<WebinarContextState | undefined>(undefined);

// Provider props type
interface WebinarProviderProps {
  children: ReactNode;
}

// Provide a hook to use the webinar context
export const useWebinarContext = () => {
  const context = useContext(WebinarContext);
  if (context === undefined) {
    throw new Error('useWebinarContext must be used within a WebinarProvider');
  }
  return context;
};

export { WebinarContext };
export type { ViewMode, FilterTab };
