
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useZoomCredentials } from './useZoomCredentials';
import { 
  WebinarService,
  SyncHistoryService 
} from './services';
import { 
  refreshWebinarsOperation, 
  updateParticipantDataOperation 
} from './webinarOperations';
import { parseErrorDetails } from './utils/errorUtils';
import { enhanceErrorMessage } from './utils/errorUtils';
import { toast } from '@/hooks/use-toast';
import { UseZoomWebinarsResult } from './types/webinarTypes';

export function useZoomWebinars(): UseZoomWebinarsResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const { credentialsStatus, checkCredentialsStatus } = useZoomCredentials();
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [tokenRefreshAttempted, setTokenRefreshAttempted] = useState(false);

  // Main query to fetch webinars
  const { data, error, refetch } = useQuery({
    queryKey: ['zoom-webinars', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        setIsLoading(true);
        console.log('[useZoomWebinars] Fetching webinars from database or API');
        
        // Try to get webinars from database first
        const dbWebinars = await WebinarService.fetchWebinarsFromDatabase(user.id);
        
        // If we have webinars in the database, return them immediately
        if (dbWebinars && dbWebinars.length > 0) {
          console.log(`[useZoomWebinars] Returning ${dbWebinars.length} webinars from database`);
          return dbWebinars;
        }
        
        // If not in database or database fetch failed, try API
        console.log('[useZoomWebinars] No webinars in database, fetching from API');
        return await WebinarService.fetchWebinarsFromAPI();
      } catch (err: any) {
        console.error('[useZoomWebinars] Error fetching webinars:', err);
        
        // If the error indicates token refresh is needed
        if (err.message && (
          err.message.includes('token refreshed') || 
          err.message.includes('retry your request')
        )) {
          console.log('[useZoomWebinars] Token was refreshed, retrying request');
          
          // Only attempt this once to prevent infinite loops
          if (!tokenRefreshAttempted) {
            setTokenRefreshAttempted(true);
            
            // Refresh credentials status since token has been refreshed
            await checkCredentialsStatus();
            
            // Try the request again with a slight delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            return await WebinarService.fetchWebinarsFromAPI();
          }
        }
        
        // Parse and enhance error messages for better user experience
        const errorMessage = enhanceErrorMessage(err);
        
        toast({
          title: 'Failed to fetch webinars',
          description: errorMessage,
          variant: 'destructive'
        });
        
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
        setTokenRefreshAttempted(false); // Reset for next time
      }
    },
    enabled: !!user && !!credentialsStatus?.hasCredentials,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });

  // Refresh webinars function with improved error handling
  const refreshWebinars = async (force: boolean = false): Promise<void> => {
    setIsRefetching(true);
    try {
      await refreshWebinarsOperation(user?.id, queryClient, force);
      await refetch();
    } catch (err: any) {
      // Handle token refresh response
      if (err.message && (
        err.message.includes('token refreshed') || 
        err.message.includes('retry your request')
      )) {
        console.log('[refreshWebinars] Token was refreshed, retrying operation');
        
        // Refresh credentials status
        await checkCredentialsStatus();
        
        // Try the refresh again after a brief delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refreshWebinarsOperation(user?.id, queryClient, force);
        await refetch();
      } else {
        // Re-throw other errors
        throw err;
      }
    } finally {
      setIsRefetching(false);
    }
  };
  
  // Update participant data function - just wraps the operation function
  const updateParticipantData = async (): Promise<void> => {
    try {
      await updateParticipantDataOperation(user?.id, queryClient);
      await refetch();
    } catch (err) {
      // Error handling done in operation function
    }
  };
  
  // Get user's sync history
  useEffect(() => {
    const loadSyncHistory = async () => {
      if (!user) return;
      
      const history = await SyncHistoryService.fetchSyncHistory(user.id);
      setSyncHistory(history);
    };
    
    loadSyncHistory();
  }, [user, data]); // Refresh history when webinars data changes
  
  // Get last sync time from sync history
  const lastSyncTime = syncHistory.length > 0 
    ? new Date(syncHistory[0].created_at) 
    : null;
  
  // Parse error details
  const errorDetails = parseErrorDetails(error as Error | null);

  return {
    webinars: data || [],
    isLoading,
    isRefetching,
    error: error as Error | null,
    errorDetails,
    refreshWebinars,
    updateParticipantData,
    syncHistory,
    lastSyncTime,
    credentialsStatus
  };
}
