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
  const [mockWebinars, setMockWebinars] = useState<any[]>([]);

  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV;

  // Generate mock webinars for development
  useEffect(() => {
    if (isDevelopment && mockWebinars.length === 0) {
      const generateMockWebinars = () => {
        const now = new Date();
        const mockData = [];
        
        // Generate 10 past webinars
        for (let i = 1; i <= 10; i++) {
          const startDate = new Date(now);
          startDate.setDate(now.getDate() - (i * 7)); // Each one week apart
          
          mockData.push({
            id: `past-${i}`,
            uuid: `uuid-past-${i}`,
            topic: `Past Webinar ${i}`,
            start_time: startDate.toISOString(),
            duration: 60,
            timezone: "America/New_York",
            agenda: `Agenda for past webinar ${i}`,
            host_email: "host@example.com",
            status: "ended",
            type: 5,
            registrants_count: Math.floor(Math.random() * 100) + 50,
            participants_count: Math.floor(Math.random() * 50) + 20,
            raw_data: {
              registrants_count: Math.floor(Math.random() * 100) + 50,
              participants_count: Math.floor(Math.random() * 50) + 20
            }
          });
        }
        
        // Generate 5 upcoming webinars
        for (let i = 1; i <= 5; i++) {
          const startDate = new Date(now);
          startDate.setDate(now.getDate() + (i * 7)); // Each one week apart
          
          mockData.push({
            id: `upcoming-${i}`,
            uuid: `uuid-upcoming-${i}`,
            topic: `Upcoming Webinar ${i}`,
            start_time: startDate.toISOString(),
            duration: 60,
            timezone: "America/New_York",
            agenda: `Agenda for upcoming webinar ${i}`,
            host_email: "host@example.com",
            status: "available",
            type: 5,
            registrants_count: Math.floor(Math.random() * 30) + 10,
            participants_count: 0,
            raw_data: {
              registrants_count: Math.floor(Math.random() * 30) + 10,
              participants_count: 0
            }
          });
        }
        
        // Generate 1 live webinar
        const liveStartDate = new Date(now);
        liveStartDate.setHours(now.getHours() - 1); // Started 1 hour ago
        
        mockData.push({
          id: "live-1",
          uuid: "uuid-live-1",
          topic: "Live Webinar Now",
          start_time: liveStartDate.toISOString(),
          duration: 120, // 2 hours duration
          timezone: "America/New_York",
          agenda: "Agenda for live webinar",
          host_email: "host@example.com",
          status: "started",
          type: 5,
          registrants_count: 75,
          participants_count: 42,
          raw_data: {
            registrants_count: 75,
            participants_count: 42
          }
        });
        
        return mockData;
      };
      
      setMockWebinars(generateMockWebinars());
    }
  }, [isDevelopment, mockWebinars.length]);

  // Main query to fetch webinars
  const { data, error, refetch } = useQuery({
    queryKey: ['zoom-webinars', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        setIsLoading(true);
        console.log('[useZoomWebinars] Fetching webinars from database or API');
        
        // If in development mode, return mock data
        if (isDevelopment) {
          console.log('[useZoomWebinars] Using mock webinars in development mode');
          return mockWebinars;
        }
        
        // Try to get webinars from database first
        const dbWebinars = await fetchWebinarsFromDatabase(user.id);
        
        // If we have webinars in the database, return them immediately
        if (dbWebinars && dbWebinars.length > 0) {
          console.log(`[useZoomWebinars] Returning ${dbWebinars.length} webinars from database`);
          return dbWebinars;
        }
        
        // If not in database or database fetch failed, try API
        console.log('[useZoomWebinars] No webinars in database, fetching from API');
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
        
        // In development mode, return mock data even on error
        if (isDevelopment) {
          console.log('[useZoomWebinars] Returning mock data after error in development mode');
          return mockWebinars;
        }
        
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    enabled: !!user && (!!credentialsStatus?.hasCredentials || isDevelopment),
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });

  // Refresh webinars function - just wraps the operation function
  const refreshWebinars = async (force: boolean = false): Promise<void> => {
    setIsRefetching(true);
    try {
      if (isDevelopment) {
        // In development, just simulate a refresh
        console.log('[useZoomWebinars] Simulating refresh in development mode');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refetch();
      } else {
        await refreshWebinarsOperation(user?.id, queryClient, force);
        await refetch();
      }
    } catch (err) {
      console.error('[useZoomWebinars] Error during refresh:', err);
      // Error handling is done in the operation function
    } finally {
      setIsRefetching(false);
    }
  };
  
  // Update participant data function - just wraps the operation function
  const updateParticipantData = async (): Promise<void> => {
    try {
      if (isDevelopment) {
        // In development, just simulate an update
        console.log('[useZoomWebinars] Simulating participant data update in development mode');
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast({
          title: 'Participant data updated',
          description: 'Simulated update in development mode',
          variant: 'default'
        });
      } else {
        await updateParticipantDataOperation(user?.id, queryClient);
      }
      await refetch();
    } catch (err) {
      // Error handling done in operation function
      console.error('[useZoomWebinars] Error updating participant data:', err);
    }
  };
  
  // Get user's sync history
  useEffect(() => {
    const loadSyncHistory = async () => {
      if (!user) return;
      
      if (isDevelopment) {
        // Generate mock sync history in development
        const mockHistory = [
          {
            id: '1',
            created_at: new Date().toISOString(),
            sync_type: 'webinars',
            status: 'success',
            items_synced: 16,
            message: 'Mock sync history entry'
          }
        ];
        setSyncHistory(mockHistory);
        return;
      }
      
      const history = await fetchSyncHistory(user.id);
      setSyncHistory(history);
    };
    
    loadSyncHistory();
  }, [user, data, isDevelopment]); // Refresh history when webinars data changes
  
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