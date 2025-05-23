
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WebinarRecording {
  id: string;
  webinar_id: string;
  instance_id: string;
  recording_id: string;
  recording_type: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  play_url: string;
  download_url: string;
  status: string;
  duration: number;
  password?: string;
}

export interface WebinarRecordingsData {
  recordings: WebinarRecording[];
  totalRecordings: number;
  totalDuration: number;
}

export const useZoomWebinarRecordings = (webinarId: string | null) => {
  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch
  } = useQuery({
    queryKey: ['webinar', webinarId, 'recordings'],
    queryFn: async (): Promise<WebinarRecordingsData> => {
      if (!webinarId) {
        return { recordings: [], totalRecordings: 0, totalDuration: 0 };
      }

      const { data, error } = await supabase
        .from('zoom_webinar_recordings')
        .select('*')
        .eq('webinar_id', webinarId)
        .order('recording_start', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch recordings: ${error.message}`);
      }

      const recordings = data || [];
      const totalDuration = recordings.reduce((acc, rec) => acc + (rec.duration || 0), 0);

      return {
        recordings,
        totalRecordings: recordings.length,
        totalDuration
      };
    },
    enabled: !!webinarId,
    refetchOnWindowFocus: false
  });

  return {
    recordings: data?.recordings || [],
    totalRecordings: data?.totalRecordings || 0,
    totalDuration: data?.totalDuration || 0,
    isLoading,
    isRefetching,
    error,
    refetch
  };
};
