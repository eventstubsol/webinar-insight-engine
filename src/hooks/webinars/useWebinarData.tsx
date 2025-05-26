
import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  const { checkCredentialsStatus } = useZoomCredentials();
  
  const [isRefreshError, setIsRefreshError] = useState(false);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  
  // Determine verified status from credentials status and errors
  const verified = credentialsStatus?.hasCredentials && 
                  !errorDetails.isMissingCredentials && 
                  !errorDetails.isScopesError;
                  
  const isVerifying = isLoading && !isRefetching;
  
  // Explicitly ensure scopesError is a boolean
  const scopesError: boolean = Boolean(errorDetails.isScopesError);
  
  // Reset error state on new error
  useEffect(() => {
    if (error) {
      console.log('[useWebinarData] Error detected:', error.message);
    }
  }, [error]);
  
  // Wrapper around refreshWebinars to add additional state management
  const handleRefresh = useCallback(async (force: boolean = false) => {
    if (!error && credentialsStatus?.hasCredentials) {
      setIsManualRefresh(true);
      setIsRefreshError(false);
      
      try {
        console.log('[useWebinarData] Starting ASYNC manual refresh');
        await refreshWebinars(force);
        
        // Reset any previous refresh errors
        setIsRefreshError(false);
      } catch (err) {
        console.error('[useWebinarData] Manual refresh failed:', err);
        setIsRefreshError(true);
        
        // Error toast is handled in refreshWebinarsOperation
      } finally {
        setIsManualRefresh(false);
      }
    } else if (error) {
      toast({
        title: 'Cannot sync',
        description: 'Please fix the error before trying to sync again',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Zoom not connected',
        description: 'Please connect your Zoom account first',
        variant: 'destructive'
      });
    }
  }, [refreshWebinars, error, credentialsStatus, toast]);
  
  // Memoize the auto refresh function to prevent unnecessary recreations
  const handleAutoRefresh = useCallback(async () => {
    if (!error && credentialsStatus?.hasCredentials) {
      try {
        console.log('[useWebinarData] Starting ASYNC auto-refresh');
        await refreshWebinars();
        // Reset any previous refresh errors
        setIsRefreshError(false);
        
        // Success toast is handled in refreshWebinarsOperation
      } catch (err) {
        console.error('[useWebinarData] Auto-refresh failed:', err);
        setIsRefreshError(true);
        
        // Error toast is handled in refreshWebinarsOperation
      }
    }
  }, [refreshWebinars, error, credentialsStatus]);

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
    isRefetching: isRefetching || isManualRefresh, // Include our manual state
    error,
    errorDetails,
    refreshWebinars: handleRefresh, // Use our wrapper
    lastSyncTime,
    credentialsStatus,
    isVerifying,
    verified,
    scopesError, // Now explicitly a boolean
    checkCredentialsStatus,
    isRefreshError,
    verificationDetails: credentialsStatus,
    handleAutoRefresh
  };
}
