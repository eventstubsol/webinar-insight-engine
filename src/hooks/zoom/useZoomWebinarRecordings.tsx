
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  
  const { data, isLoading, error } = useQuery({
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

  return {
    recordings: data || [],
    isLoading,
    error
  };
}
