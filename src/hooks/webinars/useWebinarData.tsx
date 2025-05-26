
import { useState, useEffect, useCallback } from 'react';
import { useZoomWebinars, useZoomCredentials } from '@/hooks/zoom';
import { useAuth } from '@/hooks/useAuth';
import { useWebinarSync } from './useWebinarSync';
import { useWebinarState } from './useWebinarState';
import { parseErrorDetails } from '@/hooks/zoom/utils/errorHandling';

export function useWebinarData() {
  const { user } = useAuth();
  const { 
    webinars, 
    isLoading, 
    isRefetching, 
    error, 
    lastSyncTime, 
    credentialsStatus 
  } = useZoomWebinars();
  
  const { checkCredentialsStatus } = useZoomCredentials();
  const { executeSync, isSyncing } = useWebinarSync();
  const { AUTO_REFRESH_INTERVAL } = useWebinarState();
  
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  
  // Parse error details
  const errorDetails = parseErrorDetails(error);
  
  // Determine verification status
  const verified = credentialsStatus?.hasCredentials && 
                  !errorDetails.isMissingCredentials && 
                  !errorDetails.isScopesError;
                  
  const isVerifying = isLoading && !isRefetching;
  const scopesError = Boolean(errorDetails.isScopesError);
  
  // Manual refresh handler
  const handleRefresh = useCallback(async (force: boolean = false) => {
    if (!verified) {
      throw new Error('Cannot sync: Please fix authentication issues first');
    }

    setIsManualRefresh(true);
    
    try {
      await executeSync(force);
    } finally {
      setIsManualRefresh(false);
    }
  }, [verified, executeSync]);
  
  // Auto refresh handler
  const handleAutoRefresh = useCallback(async () => {
    if (!verified || errorDetails.isScopesError) {
      return;
    }

    try {
      await executeSync();
    } catch (err) {
      console.error('[useWebinarData] Auto-refresh failed:', err);
    }
  }, [verified, errorDetails.isScopesError, executeSync]);

  // Set up automatic refresh
  useEffect(() => {
    if (!verified || errorDetails.isScopesError) {
      return;
    }

    // Initial refresh if no data and not loading
    if (!isLoading && !isRefetching && !error && !lastSyncTime) {
      handleAutoRefresh();
    }

    // Set up interval for periodic refreshes
    const intervalId = setInterval(handleAutoRefresh, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [handleAutoRefresh, isLoading, isRefetching, error, lastSyncTime, verified, errorDetails.isScopesError]);
  
  return {
    webinars,
    isLoading,
    isRefetching: isRefetching || isManualRefresh || isSyncing,
    error,
    errorDetails,
    refreshWebinars: handleRefresh,
    lastSyncTime,
    credentialsStatus,
    isVerifying,
    verified,
    scopesError,
    checkCredentialsStatus,
    verificationDetails: credentialsStatus,
    handleAutoRefresh
  };
}
