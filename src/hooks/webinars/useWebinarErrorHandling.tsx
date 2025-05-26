
import { useState, useEffect } from 'react';

export function useWebinarErrorHandling(
  error: Error | null,
  errorDetails: {
    isMissingCredentials: boolean;
    isCapabilitiesError: boolean;
    isScopesError: boolean;
    missingSecrets: string[];
  },
  errorBannerDismissed: boolean,
  isFirstLoad: boolean,
  activeTab: string,
  setActiveTab: (tab: string) => void
) {
  // Reset error dismissal state when there's a new error
  useEffect(() => {
    if (error) {
      console.log('[useWebinarErrorHandling] Error state updated:', error.message);
    }
  }, [error]);

  // Error message preparation
  const errorMessage: string | null = error?.message || null;

  // Initial load tracking and tab selection logic
  useEffect(() => {
    // Only automatically switch to setup tab for critical configuration errors
    if (error && 
        !isFirstLoad && 
        (errorDetails.isMissingCredentials || errorDetails.isScopesError) && 
        activeTab !== "setup" && 
        !errorBannerDismissed) {
      console.log('[useWebinarErrorHandling] Critical configuration error detected, switching to setup tab');
      setActiveTab("setup");
    }
  }, [error, errorDetails, activeTab, isFirstLoad, errorBannerDismissed, setActiveTab]);

  return {
    errorMessage
  };
}
