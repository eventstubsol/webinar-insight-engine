
import { useState, useEffect, useCallback } from 'react';
import { useZoomWebinars, useZoomCredentials } from '@/hooks/zoom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
const ERROR_PERSIST_KEY = 'zoom-webinar-error-dismissed';

export const useWebinarState = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    webinars, 
    isLoading, 
    isRefetching, 
    error, 
    errorDetails, 
    refreshWebinars, 
    lastSyncTime, 
    credentialsStatus 
  } = useZoomWebinars();
  
  // We no longer need useZoomCredentialsVerification since we're relying on 
  // the data fetching process to verify credentials
  const { checkCredentialsStatus } = useZoomCredentials();
  
  // Determine verified status from credentials status and errors
  const verified = credentialsStatus?.hasCredentials && 
                  !errorDetails.isMissingCredentials && 
                  !errorDetails.isScopesError;
                  
  const isVerifying = isLoading && !isRefetching;
  const scopesError = errorDetails.isScopesError;
  
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("webinars");
  const [showWizard, setShowWizard] = useState(false);
  
  // Grid view is default
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'upcoming', 'past', 'drafts'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  
  // Track if user has dismissed the error banner
  const [errorBannerDismissed, setErrorBannerDismissed] = useState(
    localStorage.getItem(ERROR_PERSIST_KEY) === 'true'
  );
  
  // Dismiss error banner and remember the choice
  const dismissErrorBanner = useCallback(() => {
    setErrorBannerDismissed(true);
    localStorage.setItem(ERROR_PERSIST_KEY, 'true');
    
    // Log for debugging
    console.log('[useWebinarState] Error banner dismissed by user');
  }, []);
  
  // Reset error dismissal state when there's a new error
  useEffect(() => {
    if (error) {
      // Only reset if the previous error was dismissed and there's actually a new error
      if (errorBannerDismissed && error.message) {
        console.log('[useWebinarState] New error detected, resetting dismissal state');
        setErrorBannerDismissed(false);
        localStorage.removeItem(ERROR_PERSIST_KEY);
      }
    }
  }, [error, errorBannerDismissed]);
  
  // Memoize the refresh function to prevent unnecessary recreations
  const handleAutoRefresh = useCallback(async () => {
    if (!error && credentialsStatus?.hasCredentials) {
      try {
        console.log('[useWebinarState] Starting auto-refresh');
        await refreshWebinars();
        // Silent toast for background refreshes
        toast({
          title: 'Webinars synced',
          description: 'Webinar data has been updated from Zoom',
          variant: 'default'
        });
      } catch (err) {
        console.error('[useWebinarState] Auto-refresh failed:', err);
        // Only show error toast for auto-refresh failures if it's a new error
        toast({
          title: 'Sync failed',
          description: 'Could not automatically refresh webinar data',
          variant: 'destructive'
        });
      }
    }
  }, [refreshWebinars, error, toast, credentialsStatus]);

  // Setup event listeners for components communication
  useEffect(() => {
    const handleViewModeChange = (e: CustomEvent) => {
      setViewMode(e.detail as 'list' | 'grid');
    };
    
    const handleFilterTabChange = (e: CustomEvent) => {
      setFilterTab(e.detail);
    };
    
    window.addEventListener('viewModeChange', handleViewModeChange as EventListener);
    window.addEventListener('filterTabChange', handleFilterTabChange as EventListener);
    
    return () => {
      window.removeEventListener('viewModeChange', handleViewModeChange as EventListener);
      window.removeEventListener('filterTabChange', handleFilterTabChange as EventListener);
    };
  }, []);

  // Check if this is the first login and open wizard if needed
  useEffect(() => {
    if (user && !isLoading && credentialsStatus !== undefined) {
      // If user is logged in and we've checked their credentials status
      if (!credentialsStatus?.hasCredentials) {
        console.log('[useWebinarState] No credentials found, showing wizard');
        // If they don't have credentials, show the wizard
        setShowWizard(true);
      }
    }
  }, [user, credentialsStatus, isLoading]);

  // Set up automatic refresh on mount and when dependencies change
  useEffect(() => {
    // Skip auto-refresh if there are credential errors
    if (!credentialsStatus?.hasCredentials || errorDetails.isScopesError || scopesError) {
      return;
    }

    // Initial refresh on mount if not loading
    if (!isLoading && !isRefetching && !error && !lastSyncTime) {
      handleAutoRefresh();
    }

    // Set up interval for periodic refreshes
    const intervalId = setInterval(() => {
      handleAutoRefresh();
    }, AUTO_REFRESH_INTERVAL);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [handleAutoRefresh, isLoading, isRefetching, error, lastSyncTime, errorDetails, scopesError, credentialsStatus]);
  
  // Initial load tracking and tab selection logic
  useEffect(() => {
    // Track if data has been loaded at least once
    if (!isLoading && isFirstLoad) {
      console.log('[useWebinarState] First load complete');
      setIsFirstLoad(false);
    }

    // Only automatically switch to setup tab for critical configuration errors
    if (error && 
        !isFirstLoad && 
        (errorDetails.isMissingCredentials || errorDetails.isScopesError) && 
        activeTab !== "setup" && 
        !errorBannerDismissed) {
      console.log('[useWebinarState] Critical configuration error detected, switching to setup tab');
      setActiveTab("setup");
    }
  }, [isLoading, error, errorDetails, activeTab, isFirstLoad, errorBannerDismissed]);
  
  // Handle setup wizard opening
  const handleSetupZoom = () => {
    console.log('[useWebinarState] Opening Zoom setup wizard');
    setShowWizard(true);
    // Reset error dismissal when user explicitly chooses to configure
    setErrorBannerDismissed(false);
    localStorage.removeItem(ERROR_PERSIST_KEY);
  };
  
  // Handle wizard completion
  const handleWizardComplete = async () => {
    console.log('[useWebinarState] Wizard complete, refreshing credentials and webinars');
    setShowWizard(false);
    // Re-check credentials status
    await checkCredentialsStatus();
    // Refresh webinars
    await refreshWebinars();
    // Switch to webinars tab
    setActiveTab("webinars");
    // Reset error dismissal
    setErrorBannerDismissed(false);
    localStorage.removeItem(ERROR_PERSIST_KEY);
  };
  
  const errorMessage = error?.message || 'An error occurred while connecting to the Zoom API';
  
  return {
    webinars,
    isLoading,
    isRefetching,
    error,
    errorDetails,
    refreshWebinars,
    lastSyncTime,
    credentialsStatus,
    isVerifying,
    verified,
    scopesError,
    // We'll use the webinar data fetch details instead of a separate verification
    verificationDetails: credentialsStatus,
    isFirstLoad,
    activeTab,
    setActiveTab,
    showWizard,
    setShowWizard,
    viewMode,
    filterTab,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    handleSetupZoom,
    handleWizardComplete,
    errorMessage,
    dismissErrorBanner,
    errorBannerDismissed
  };
};
