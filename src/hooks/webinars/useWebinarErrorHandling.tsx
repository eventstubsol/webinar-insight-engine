
import { useEffect } from 'react';
import { parseErrorDetails } from '@/hooks/zoom/utils/errorHandling';

export function useWebinarErrorHandling(
  error: Error | null,
  errorBannerDismissed: boolean,
  isFirstLoad: boolean,
  activeTab: string,
  setActiveTab: (tab: string) => void
) {
  const errorDetails = parseErrorDetails(error);

  // Reset error dismissal state when there's a new error
  useEffect(() => {
    if (error) {
      console.log('[useWebinarErrorHandling] Error state updated:', error.message);
    }
  }, [error]);

  // Auto-switch to setup tab for critical errors
  useEffect(() => {
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
    errorMessage: error?.message || null,
    errorDetails
  };
}
