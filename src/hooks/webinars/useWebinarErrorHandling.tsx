
import { useState, useEffect } from 'react';
import { parseErrorDetails } from '@/hooks/zoom/utils/errorHandling';

export function useWebinarErrorHandling(
  error: Error | null,
  errorDetails: any
) {
  const [errorBannerDismissed, setErrorBannerDismissed] = useState(false);

  // Reset error dismissal state when there's a new error
  useEffect(() => {
    if (error) {
      console.log('[useWebinarErrorHandling] Error state updated:', error.message);
      setErrorBannerDismissed(false); // Reset dismissal on new error
    }
  }, [error]);

  const dismissErrorBanner = () => {
    setErrorBannerDismissed(true);
  };

  const resetErrorBanner = () => {
    setErrorBannerDismissed(false);
  };

  return {
    errorMessage: error?.message || null,
    errorDetails,
    dismissErrorBanner,
    errorBannerDismissed,
    resetErrorBanner
  };
}
