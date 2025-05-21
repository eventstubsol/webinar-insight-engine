
import { useState, useEffect, useCallback } from 'react';
import { useZoomWebinars, useZoomCredentials } from '@/hooks/zoom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ZoomCredentialsStatus } from '@/hooks/zoom';

const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

export function useWebinarData() {
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
  
  const [isRefreshError, setIsRefreshError] = useState(false);
  
  // Determine verified status from credentials status and errors
  const verified = credentialsStatus?.hasCredentials && 
                  !errorDetails.isMissingCredentials && 
                  !errorDetails.isScopesError;
                  
  const isVerifying = isLoading && !isRefetching;
  const scopesError = errorDetails.isScopesError;
  
  // Reset error state on new error
  useEffect(() => {
    if (error) {
      // Only log new errors
      console.log('[useWebinarData] Error detected:', error.message);
    }
  }, [error]);
  
  // Memoize the refresh function to prevent unnecessary recreations
  const handleAutoRefresh = useCallback(async () => {
    if (!error && credentialsStatus?.hasCredentials) {
      try {
        console.log('[useWebinarData] Starting auto-refresh');
        await refreshWebinars();
        // Reset any previous refresh errors
        setIsRefreshError(false);
        
        // Silent toast for background refreshes
        toast({
          title: 'Webinars synced',
          description: 'Webinar data has been updated from Zoom',
          variant: 'default'
        });
      } catch (err) {
        console.error('[useWebinarData] Auto-refresh failed:', err);
        setIsRefreshError(true);
        
        // Only show error toast for auto-refresh failures if it's a new error
        toast({
          title: 'Sync failed',
          description: 'Could not automatically refresh webinar data',
          variant: 'destructive'
        });
      }
    }
  }, [refreshWebinars, error, toast, credentialsStatus]);

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
    checkCredentialsStatus,
    isRefreshError,
    verificationDetails: credentialsStatus,
    handleAutoRefresh
  };
}
