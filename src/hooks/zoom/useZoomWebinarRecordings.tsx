
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ZoomDataService } from './services/ZoomDataService';

export interface WebinarRecording {
  id: string;
  recording_id: string;
  webinar_id: string;
  instance_id?: string;
  recording_type: string;
  recording_start: string | null;
  recording_end: string | null;
  duration: number | null;
  file_type?: string;
  file_size?: number;
  play_url: string | null;
  download_url: string | null;
  status: string | null;
  password?: string;
}

export function useZoomWebinarRecordings(webinarId: string | null) {
  const { user } = useAuth();
  
  const {
    data: recordings,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['zoom-webinar-recordings', user?.id, webinarId],
    queryFn: async () => {
      if (!user || !webinarId) return [];
      
      try {
        return await ZoomDataService.fetchWebinarRecordings(user.id, webinarId);
      } catch (err) {
        console.error('[useZoomWebinarRecordings] Error:', err);
        throw err;
      }
    },
    enabled: !!user && !!webinarId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
  
  return {
    recordings: recordings || [],
    isLoading,
    isRefetching,
    error,
    refetch
  };
}
