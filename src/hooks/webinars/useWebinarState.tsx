
import { useState, useEffect, useCallback } from 'react';
import { useZoomWebinars, useZoomCredentialsVerification, useZoomCredentials } from '@/hooks/zoom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

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
  
  const { 
    verifyCredentials, 
    isVerifying, 
    verified, 
    scopesError, 
    verificationDetails 
  } = useZoomCredentialsVerification();
  
  const { checkCredentialsStatus } = useZoomCredentials();
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("webinars");
  const [showWizard, setShowWizard] = useState(false);
  
  // Grid view is default
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'upcoming', 'past', 'drafts'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  
  // Memoize the refresh function to prevent unnecessary recreations
  const handleAutoRefresh = useCallback(async () => {
    if (!error && credentialsStatus?.hasCredentials) {
      try {
        await refreshWebinars();
        // Silent toast for background refreshes
        toast({
          title: 'Webinars synced',
          description: 'Webinar data has been updated from Zoom',
          variant: 'default'
        });
      } catch (err) {
        console.error('Auto-refresh failed:', err);
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
  
  useEffect(() => {
    // Track if data has been loaded at least once
    if (!isLoading && isFirstLoad) {
      setIsFirstLoad(false);
    }

    // If we have credential errors or scope errors, automatically switch to the setup tab
    if ((error && (errorDetails.isMissingCredentials || errorDetails.isScopesError)) && activeTab !== "setup") {
      setActiveTab("setup");
    }
  }, [isLoading, error, errorDetails, activeTab, isRefetching, webinars, isFirstLoad]);
  
  const handleSetupZoom = () => {
    setShowWizard(true);
  };
  
  const handleWizardComplete = async () => {
    setShowWizard(false);
    // Re-check credentials status
    await checkCredentialsStatus();
    // Refresh webinars
    await refreshWebinars();
    // Switch to webinars tab
    setActiveTab("webinars");
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
    verifyCredentials,
    isVerifying,
    verified,
    scopesError,
    verificationDetails,
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
    errorMessage
  };
};
