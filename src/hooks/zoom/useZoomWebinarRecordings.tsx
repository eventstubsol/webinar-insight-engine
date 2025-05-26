import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { zoomApiClient } from './services/zoomApiClient';

export interface ZoomRecording {
  id: string;
  recording_id: string;
  webinar_id: string;
  instance_id?: string;
  recording_type: string;
  file_type?: string;
  status?: string;
  download_url?: string;
  play_url?: string;
  password?: string;
  duration?: number;
  file_size?: number;
  recording_start?: string;
  recording_end?: string;
  raw_data: any;
}

export function useZoomWebinarRecordings(webinarId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['zoom-webinar-recordings', user?.id, webinarId],
    queryFn: async () => {
      if (!user || !webinarId) return [];
      
      console.log(`[useZoomWebinarRecordings] Fetching recordings for webinar: ${webinarId}`);
      
      const { data: recordings, error } = await supabase
        .from('zoom_webinar_recordings')
        .select('*')
        .eq('user_id', user.id)
        .eq('webinar_id', webinarId)
        .order('recording_start', { ascending: false });
      
      if (error) {
        console.error('[useZoomWebinarRecordings] Error:', error);
        throw new Error(error.message);
      }
      
      console.log(`[useZoomWebinarRecordings] Found ${recordings?.length || 0} recordings`);
      return recordings as ZoomRecording[] || [];
    },
    enabled: !!user && !!webinarId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes
  });

  // Function to refresh recordings from Zoom API
  const refreshRecordings = async () => {
    if (!webinarId || !user) return;
    
    try {
      console.log(`[useZoomWebinarRecordings] Refreshing recordings from API for webinar: ${webinarId}`);
      await zoomApiClient.getWebinarRecordings(webinarId);
      
      // Invalidate and refetch the query to get updated data
      await queryClient.invalidateQueries({ 
        queryKey: ['zoom-webinar-recordings', user.id, webinarId] 
      });
    } catch (error) {
      console.error('[useZoomWebinarRecordings] Error refreshing recordings:', error);
      throw error;
    }
  };

  return {
    recordings: data || [],
    isLoading,
    error,
    refreshRecordings,
    refetch
  };
}
