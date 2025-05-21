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

// Calculate date ranges for last 12 months and next 12 months
function getDateRanges() {
  const now = new Date();
  
  // Last 12 months
  const startDate = new Date(now);
  startDate.setMonth(now.getMonth() - 12);
  
  // Next 12 months
  const endDate = new Date(now);
  endDate.setMonth(now.getMonth() + 12);
  
  return { startDate, endDate };
}

export function useZoomWebinars(): UseZoomWebinarsResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const { credentialsStatus } = useZoomCredentials();
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  
  // Calculate date ranges for filtering (last 12 months and next 12 months)
  const { startDate, endDate } = getDateRanges();
  
  // Main query to fetch webinars with date filtering
  const { data, error, refetch } = useQuery({
    queryKey: ['zoom-webinars', user?.id, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        setIsLoading(true);
        console.log('[useZoomWebinars] Fetching webinars with date filtering');
        
        // Try to get webinars from database first with date filtering
        const dbWebinars = await fetchWebinarsFromDatabase(user.id, startDate, endDate);
        
        // If we have webinars in the database, return them immediately
        if (dbWebinars && dbWebinars.length > 0) {
          console.log(`[useZoomWebinars] Returning ${dbWebinars.length} date-filtered webinars from database`);
          return dbWebinars;
        }
        
        // If not in database or database fetch failed, try API with date filtering
        console.log('[useZoomWebinars] No webinars in database, fetching from API with date filtering');
        return await fetchWebinarsFromAPI(false, startDate, endDate, 2); // Using batch size of 2
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

  // Refresh webinars function with date filtering
  const refreshWebinars = async (force: boolean = false): Promise<void> => {
    setIsRefetching(true);
    try {
      // Use the updated operation with date filtering
      await refreshWebinarsOperation(user?.id, queryClient, force, startDate, endDate, 2);
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
  
  // Parse error details
  const errorDetails = parseErrorDetails(error as Error | null);

  return {
    webinars: data || [],
    isLoading,
    isRefetching,
    error: error as Error | null,
    errorDetails,
    refreshWebinars,
    updateParticipantData: updateParticipantDataOperation.bind(null, user?.id, queryClient),
    syncHistory,
    lastSyncTime,
    credentialsStatus,
    dateRange: { startDate, endDate }
  };
}
