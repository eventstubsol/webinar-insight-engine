
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useZoomCredentials } from './useZoomCredentials';
import { 
  fetchWebinarsFromDatabase, 
  fetchWebinarsFromAPI,
  fetchSyncHistory 
} from './services/webinarApiService';
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
  const { credentialsStatus } = useZoomCredentials();
  const [syncHistory, setSyncHistory] = useState<any[]>([]);

  // Main query to fetch webinars with enhanced strategy
  const { data, error, refetch } = useQuery({
    queryKey: ['zoom-webinars', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        setIsLoading(true);
        console.log('[useZoomWebinars] Fetching webinars with enhanced strategy');
        
        // Try to get webinars from database first
        const dbWebinars = await fetchWebinarsFromDatabase(user.id);
        
        // If we have webinars in the database, return them immediately
        if (dbWebinars && dbWebinars.length > 0) {
          console.log(`[useZoomWebinars] Returning ${dbWebinars.length} webinars from database`);
          
          // Check if we have a good mix of historical and upcoming webinars
          const historicalCount = dbWebinars.filter(w => 
            w.status === 'ended' || 
            (w.actual_start_time && new Date(w.actual_start_time) < new Date())
          ).length;
          
          const upcomingCount = dbWebinars.length - historicalCount;
          
          console.log(`[useZoomWebinars] Database contains ${historicalCount} historical and ${upcomingCount} upcoming webinars`);
          
          // If we have very few historical webinars, trigger background sync
          if (historicalCount < 5 && upcomingCount > 0) {
            console.log('[useZoomWebinars] Low historical webinar count, triggering background enhanced sync');
            // Trigger background sync without waiting
            fetchWebinarsFromAPI(false).catch(err => {
              console.error('[useZoomWebinars] Background enhanced sync failed:', err);
            });
          }
          
          return dbWebinars;
        }
        
        // If not in database or database fetch failed, use enhanced API strategy
        console.log('[useZoomWebinars] No webinars in database, fetching from enhanced API');
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

  // Enhanced refresh function using the new strategy
  const refreshWebinars = async (force: boolean = false): Promise<void> => {
    setIsRefetching(true);
    try {
      console.log(`[useZoomWebinars] Starting enhanced refresh with force=${force}`);
      await refreshWebinarsOperation(user?.id, queryClient, force);
      await refetch();
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
  
  // Get user's sync history with enhanced logging
  useEffect(() => {
    const loadSyncHistory = async () => {
      if (!user) return;
      
      const history = await fetchSyncHistory(user.id);
      setSyncHistory(history);
      
      // Log recent sync information
      if (history.length > 0) {
        const recentSync = history[0];
        console.log('[useZoomWebinars] Most recent sync:', {
          type: recentSync.sync_type,
          status: recentSync.status,
          itemsSynced: recentSync.items_synced,
          timestamp: recentSync.created_at
        });
      }
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
