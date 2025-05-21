
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useZoomCredentials } from './useZoomCredentials';
import { ZoomWebinar } from './types';
import { 
  fetchWebinarsFromDatabase, 
  fetchWebinarsFromAPI, 
  enhanceErrorMessage,
  updateParticipantDataForWebinars,
  fetchSyncHistory
} from './utils/webinarUtils';
import { UseZoomWebinarsResult, WebinarErrorDetails } from './types/webinarTypes';

export function useZoomWebinars(): UseZoomWebinarsResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const { credentialsStatus } = useZoomCredentials();
  const [syncHistory, setSyncHistory] = useState<any[]>([]);

  const { data, error, refetch } = useQuery({
    queryKey: ['zoom-webinars', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        setIsLoading(true);
        console.log('[useZoomWebinars] Fetching webinars from database or API');
        
        // Try to get webinars from database first
        const dbWebinars = await fetchWebinarsFromDatabase(user.id);
        
        // If we have webinars in the database, return them immediately
        if (dbWebinars && dbWebinars.length > 0) {
          return dbWebinars;
        }
        
        // If not in database or database fetch failed, try API
        return await fetchWebinarsFromAPI();
      } catch (err: any) {
        console.error('[useZoomWebinars] Error fetching webinars:', err);
        
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
      }
    },
    enabled: !!user && !!credentialsStatus?.hasCredentials,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });

  const refreshWebinars = async (force: boolean = false) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to refresh webinars',
        variant: 'destructive'
      });
      return;
    }
    
    setIsRefetching(true);
    console.log(`[refreshWebinars] Starting refresh with force=${force}`);
    
    try {
      // Make the API call to fetch fresh data from Zoom
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'list-webinars',
          force_sync: force 
        }
      });
      
      if (refreshError) {
        console.error('[refreshWebinars] Error during refresh:', refreshError);
        toast({
          title: 'Sync failed',
          description: refreshError.message || 'Failed to sync with Zoom API',
          variant: 'destructive'
        });
        throw refreshError;
      }
      
      if (refreshData.error) {
        console.error('[refreshWebinars] API returned error:', refreshData.error);
        toast({
          title: 'Sync failed',
          description: refreshData.error,
          variant: 'destructive'
        });
        throw new Error(refreshData.error);
      }
      
      console.log('[refreshWebinars] Sync completed successfully:', refreshData);
      
      // Show appropriate toast based on sync results
      if (refreshData.syncResults) {
        if (refreshData.syncResults.itemsUpdated > 0) {
          toast({
            title: 'Webinars synced',
            description: `Successfully updated ${refreshData.syncResults.itemsUpdated} webinars from Zoom`,
            variant: 'success'
          });
        } else {
          toast({
            title: 'No changes found',
            description: 'No webinar changes detected in your Zoom account',
          });
        }
      } else {
        toast({
          title: 'Webinars synced',
          description: 'Webinar data has been updated from Zoom'
        });
      }

      // Invalidate the query cache to force a refresh
      await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', user.id] });
      
      // Trigger a refetch to get the latest data
      const refetchResult = await refetch();
      return refetchResult.data;
    } catch (err: any) {
      console.error('[refreshWebinars] Error during refresh:', err);
      // Error handling already done above
    } finally {
      setIsRefetching(false);
    }
  };
  
  const updateParticipantData = async () => {
    try {
      await updateParticipantDataForWebinars(user?.id);
      
      // Invalidate the query cache to force a refresh
      await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', user?.id] });
      
      // Trigger a refetch to get the latest data
      const refetchResult = await refetch();
      return refetchResult.data;
    } catch (err) {
      console.error('[updateParticipantData] Error:', err);
      // Error handling already done in the utility function
    }
  };
  
  // Get user's sync history
  useEffect(() => {
    const loadSyncHistory = async () => {
      if (!user) return;
      
      const history = await fetchSyncHistory(user.id);
      setSyncHistory(history);
    };
    
    loadSyncHistory();
  }, [user, data]); // Refresh history when webinars data changes
  
  // Get last sync time from sync history
  const lastSyncTime = syncHistory.length > 0 
    ? new Date(syncHistory[0].created_at) 
    : null;
  
  const errorDetails: WebinarErrorDetails = {
    isMissingCredentials: (!credentialsStatus?.hasCredentials) ||
                         error?.message?.includes('credentials not configured'),
    isCapabilitiesError: error?.message?.includes('capabilities'),
    isScopesError: error?.message?.includes('scopes') || 
                 error?.message?.includes('scope') || 
                 error?.message?.includes('4711'),
    missingSecrets: []
  };

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
