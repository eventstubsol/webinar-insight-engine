
import { useState, useCallback } from 'react';
import { useWebinarData } from './useWebinarData';
import { useWebinarUIState } from './useWebinarUIState';
import { useWebinarErrorHandling } from './useWebinarErrorHandling';
import { useWebinarActions } from './useWebinarActions';

export function useWebinarState() {
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [activeTab, setActiveTab] = useState("webinars");
  const [showWizard, setShowWizard] = useState(false);
  
  // Get webinar data
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
  
  // Get UI state
  const {
    viewMode,
    filterTab,
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange
  } = useWebinarUIState();
  
  // Get error handling
  const {
    errorMessage,
    dismissErrorBanner,
    errorBannerDismissed,
    resetErrorBanner
  } = useWebinarErrorHandling(error, errorDetails);
  
  // Get actions
  const {
    handleSetupZoom,
    handleWizardComplete,
    handleRefresh
  } = useWebinarActions(
    setShowWizard,
    checkCredentialsStatus,
    setActiveTab,
    resetErrorBanner
  );
  
  // Auto refresh interval
  const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  // Update first load state
  const updateFirstLoad = useCallback(() => {
    if (isFirstLoad && (!isLoading || webinars.length > 0)) {
      setIsFirstLoad(false);
    }
  }, [isFirstLoad, isLoading, webinars.length]);
  
  // Call update on each render
  updateFirstLoad();
  
  return {
    // Data
    webinars,
    isLoading,
    isRefetching,
    error,
    errorDetails,
    refreshWebinars: handleRefresh,
    lastSyncTime,
    credentialsStatus,
    isVerifying,
    verified,
    scopesError,
    verificationDetails,
    
    // UI State
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
    dateRange,
    setDateRange,
    
    // Actions
    handleSetupZoom,
    handleWizardComplete,
    checkCredentialsStatus,
    
    // Error handling
    errorMessage,
    dismissErrorBanner,
    errorBannerDismissed,
    
    // Config
    AUTO_REFRESH_INTERVAL
  };
}
