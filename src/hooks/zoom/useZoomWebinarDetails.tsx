
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useZoomWebinarDetails(webinarId: string | null) {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['zoom-webinar', user?.id, webinarId],
    queryFn: async () => {
      if (!user || !webinarId) return null;
      
      // Try to get from database first
      const { data: dbWebinar, error: dbError } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id)
        .eq('webinar_id', webinarId)
        .single();
      
      if (!dbError && dbWebinar) {
        return dbWebinar.raw_data;
      }
      
      // If not in database, fetch from API
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { action: 'get-webinar', id: webinarId }
      });
      
      if (error) throw new Error(error.message);
      return data.webinar;
    },
    enabled: !!user && !!webinarId,
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes
  });

  return {
    webinar: data,
    isLoading,
    error
  };
}
