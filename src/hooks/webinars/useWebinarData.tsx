
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { 
  useZoomCredentials, 
  useZoomWebinars 
} from '@/hooks/zoom';
import { 
  refreshWebinarsOperation, 
  updateParticipantDataOperation 
} from '@/hooks/zoom/operations';

export const useWebinarData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get Zoom credentials status
  const { 
    credentialsStatus, 
    checkCredentialsStatus,
    isVerifying, 
    verified, 
    scopesError,
    verificationDetails
  } = useZoomCredentials();

  // Get webinars data
  const { 
    webinars, 
    isLoading,
    isRefetching,
    error,
    errorDetails,
    syncHistory,
    lastSyncTime
  } = useZoomWebinars();

  // Refresh webinars with improved error handling
  const refreshWebinars = useCallback(async (force: boolean = false) => {
    if (!user?.id) return;
    
    setIsRefreshing(true);
    try {
      await refreshWebinarsOperation(user.id, queryClient, force);
    } catch (error) {
      console.error('Error refreshing webinars:', error);
      // Error handling done in operation function
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id, queryClient]);

  return {
    webinars,
    isLoading,
    isRefetching,
    error,
    errorDetails,
    refreshWebinars,
    lastSyncTime,
    credentialsStatus,
    checkCredentialsStatus,
    isVerifying,
    verified,
    scopesError,
    verificationDetails
  };
};
