
import { useState, useEffect } from 'react';
import { useWebinarUIState } from './useWebinarUIState';
import { useWebinarData } from './useWebinarData';
import { useWebinarErrorHandling } from './useWebinarErrorHandling';
import { useWebinarSetupActions } from './useWebinarSetupActions';

export const useWebinarState = () => {
  // UI state management
  const {
    isFirstLoad,
    setIsFirstLoad,
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
    errorBannerDismissed,
    dismissErrorBanner
  } = useWebinarUIState();

  // Data fetching and synchronization
  const {
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
    checkCredentialsStatus,
    verificationDetails
  } = useWebinarData();

  // Error handling logic
  const {
    errorMessage
  } = useWebinarErrorHandling(
    error,
    errorDetails,
    errorBannerDismissed,
    isFirstLoad,
    activeTab,
    setActiveTab
  );

  // Setup and wizard actions
  const {
    handleSetupZoom,
    handleWizardComplete
  } = useWebinarSetupActions(
    setShowWizard,
    checkCredentialsStatus,
    refreshWebinars,
    setActiveTab,
    (dismissed: boolean) => {
      if (dismissed) {
        dismissErrorBanner();
      } else {
        localStorage.removeItem('zoom-webinar-error-dismissed');
      }
    }
  );

  // Track if data has been loaded at least once
  useEffect(() => {
    if (!isLoading && isFirstLoad) {
      console.log('[useWebinarState] First load complete');
      setIsFirstLoad(false);
    }
  }, [isLoading, isFirstLoad, setIsFirstLoad]);

  // Check if this is the first login and open wizard if needed
  useEffect(() => {
    if (!isLoading && credentialsStatus !== undefined) {
      // If user is logged in and we've checked their credentials status
      if (!credentialsStatus?.hasCredentials) {
        console.log('[useWebinarState] No credentials found, showing wizard');
        // If they don't have credentials, show the wizard
        setShowWizard(true);
      }
    }
  }, [credentialsStatus, isLoading, setShowWizard]);
  
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
    errorMessage,
    dismissErrorBanner,
    errorBannerDismissed
  };
};
