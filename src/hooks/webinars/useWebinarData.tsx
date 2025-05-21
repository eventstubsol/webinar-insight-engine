
import { useState, useEffect, useCallback, useRef } from 'react';
import { useZoomWebinars, useZoomCredentials } from '@/hooks/zoom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ZoomCredentialsStatus } from '@/hooks/zoom';

const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
const MAX_REFRESH_DURATION = 60000; // 60 seconds - maximum time to allow refresh state

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
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const refreshStartTime = useRef<number | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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
      // Only log new errors
      console.log('[useWebinarData] Error detected:', error.message);
    }
  }, [error]);
  
  // Safety mechanism to reset loading state if it gets stuck
  useEffect(() => {
    if (isRefetching) {
      // Record when refresh started
      refreshStartTime.current = Date.now();
      
      // Set a safety timeout to reset the loading state if it gets stuck
      refreshTimeoutRef.current = setTimeout(() => {
        if (isRefetching) {
          console.warn('[useWebinarData] Refresh state stuck for too long, forcing reset');
          // This would normally be handled by the query component,
          // but we'll provide a fallback reset mechanism
          setIsManualRefresh(false);
          toast({
            title: 'Sync may still be in progress',
            description: 'The Zoom API may still be processing your request in the background.',
            variant: 'warning'
          });
        }
      }, MAX_REFRESH_DURATION);
      
      return () => {
        // Clear the timeout if component unmounts or isRefetching changes
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      };
    } else {
      // Reset the refresh start time when refresh completes
      refreshStartTime.current = null;
    }
  }, [isRefetching, toast]);
  
  // Wrapper around refreshWebinars to add additional state management
  const handleRefresh = useCallback(async (force: boolean = false) => {
    if (!error && credentialsStatus?.hasCredentials) {
      setIsManualRefresh(true);
      setIsRefreshError(false);
      
      try {
        console.log('[useWebinarData] Starting manual refresh');
        await refreshWebinars(force);
        
        // Reset any previous refresh errors
        setIsRefreshError(false);
        
        toast({
          title: 'Webinars synced',
          description: 'Webinar data has been updated from Zoom',
          variant: 'default'
        });
      } catch (err) {
        console.error('[useWebinarData] Manual refresh failed:', err);
        setIsRefreshError(true);
        
        toast({
          title: 'Sync failed',
          description: err.message || 'Could not refresh webinar data',
          variant: 'destructive'
        });
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
