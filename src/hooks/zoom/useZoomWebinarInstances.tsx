
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { zoomDatabaseService } from './services/zoomDatabaseService';
import { zoomApiClient } from './services/zoomApiClient';

export interface WebinarInstance {
  id: string;
  instance_id: string;
  webinar_id: string;
  webinar_uuid: string;
  topic: string;
  start_time: string | null;
  end_time: string | null;
  duration: number | null;
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
        // First try to get instances from database
        const dbInstances = await zoomDatabaseService.getWebinarInstances(user.id, webinarId);
        
        // Transform the data to match our interface
        const transformedInstances = dbInstances?.map(instance => ({
          ...instance,
          raw_data: typeof instance.raw_data === 'string' 
            ? JSON.parse(instance.raw_data) 
            : (instance.raw_data as Record<string, any>) || {}
        })) || [];
        
        // If we don't have the webinarId, just return what's in the database
        if (!webinarId) {
          return transformedInstances;
        }
        
        // If we have a webinarId but no instances in DB or we have < 2 instances,
        // try to fetch instances from the API
        if (!transformedInstances || transformedInstances.length < 2) {
          try {
            await zoomApiClient.getWebinarInstances(webinarId);
            // Refetch from database after API call
            const refreshedInstances = await zoomDatabaseService.getWebinarInstances(user.id, webinarId);
            return refreshedInstances?.map(instance => ({
              ...instance,
              raw_data: typeof instance.raw_data === 'string' 
                ? JSON.parse(instance.raw_data) 
                : (instance.raw_data as Record<string, any>) || {}
            })) || [];
          } catch (apiError) {
            console.error('[useZoomWebinarInstances] Error fetching instances from API:', apiError);
            // Return database instances even if API call fails
            return transformedInstances;
          }
        }
        
        return transformedInstances;
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
