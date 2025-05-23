
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { WebinarInstanceService } from './services/WebinarInstanceService';
import { ZoomWebinarInstance } from './types/webinarTypes';

interface UseZoomWebinarInstancesResult {
  instances: ZoomWebinarInstance[];
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
}

export function useZoomWebinarInstances(webinarId?: string): UseZoomWebinarInstancesResult {
  const { user } = useAuth();
  
  const {
    data: instances,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['zoom-webinar-instances', user?.id, webinarId],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        // First try to get instances from database
        const dbInstances = await WebinarInstanceService.fetchWebinarInstancesFromDatabase(user.id, webinarId);
        
        // If we don't have the webinarId, just return what's in the database
        if (!webinarId) {
          return dbInstances || [];
        }
        
        // If we have a webinarId but no instances in DB or we have < 2 instances,
        // try to fetch instances from the API
        if (!dbInstances || dbInstances.length < 2) {
          try {
            await WebinarInstanceService.fetchWebinarInstancesAPI(webinarId);
            // Refetch from database after API call
            const refreshedInstances = await WebinarInstanceService.fetchWebinarInstancesFromDatabase(user.id, webinarId);
            return refreshedInstances || [];
          } catch (apiError) {
            console.error('[useZoomWebinarInstances] Error fetching instances from API:', apiError);
            // Return database instances even if API call fails
            return dbInstances || [];
          }
        }
        
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
    isRefetching,
    error: error as Error | null,
    refetch
  };
}

export type { ZoomWebinarInstance };
