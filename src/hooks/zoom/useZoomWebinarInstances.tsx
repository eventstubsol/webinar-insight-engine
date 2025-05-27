
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchWebinarInstancesFromDatabase, fetchWebinarInstancesAPI } from './services/webinarApiService';

export interface WebinarInstance {
  id: string;
  instance_id: string;
  webinar_id: string;
  webinar_uuid: string;
  topic: string;
  start_time: string | null;
  end_time: string | null;
  duration: number | null;
  actual_start_time: string | null;
  actual_duration: number | null;
  status: string | null;
  participants_count: number;
  registrants_count: number;
  raw_data: Record<string, any>;
}

interface UseZoomWebinarInstancesResult {
  instances: WebinarInstance[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
}

export function useZoomWebinarInstances(webinarId?: string): UseZoomWebinarInstancesResult {
  const { user } = useAuth();
  
  const {
    data: instances,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['zoom-webinar-instances', user?.id, webinarId],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        console.log(`[useZoomWebinarInstances] Fetching instances for webinar: ${webinarId || 'all'}`);
        
        // First try to get instances from database
        const dbInstances = await fetchWebinarInstancesFromDatabase(user.id, webinarId);
        
        // If we don't have the webinarId, just return what's in the database
        if (!webinarId) {
          console.log(`[useZoomWebinarInstances] Returning ${dbInstances?.length || 0} instances from database`);
          return dbInstances || [];
        }
        
        // If we have a webinarId but no instances in DB, try to fetch from API
        if (!dbInstances || dbInstances.length === 0) {
          try {
            console.log(`[useZoomWebinarInstances] No instances in database, fetching from API for webinar ${webinarId}`);
            await fetchWebinarInstancesAPI(webinarId);
            // Refetch from database after API call
            const refreshedInstances = await fetchWebinarInstancesFromDatabase(user.id, webinarId);
            console.log(`[useZoomWebinarInstances] Fetched ${refreshedInstances?.length || 0} instances from API`);
            return refreshedInstances || [];
          } catch (apiError) {
            console.error('[useZoomWebinarInstances] Error fetching instances from API:', apiError);
            // Return database instances even if API call fails
            return dbInstances || [];
          }
        }
        
        console.log(`[useZoomWebinarInstances] Returning ${dbInstances?.length || 0} instances from database`);
        return dbInstances || [];
      } catch (err) {
        console.error('[useZoomWebinarInstances] Error:', err);
        throw err;
      }
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
  
  return {
    instances: instances || [],
    isLoading,
    error: error as Error | null,
    refetch
  };
}
