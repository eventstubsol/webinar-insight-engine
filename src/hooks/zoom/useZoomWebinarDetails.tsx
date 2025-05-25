
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useZoomWebinarDetails(webinarId: string | null) {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['zoom-webinar', user?.id, webinarId],
    queryFn: async () => {
      if (!user || !webinarId) return null;
      
      console.log(`[useZoomWebinarDetails] Fetching webinar details for: ${webinarId}`);
      
      // Try to get from database first
      const { data: dbWebinar, error: dbError } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id)
        .eq('webinar_id', webinarId)
        .single();
      
      if (!dbError && dbWebinar) {
        console.log(`[useZoomWebinarDetails] Found webinar in database:`, dbWebinar);
        
        // Safely access raw_data with proper typing
        const rawData = dbWebinar.raw_data as any;
        console.log(`[useZoomWebinarDetails] Raw data panelists:`, rawData?.panelists);
        
        // Return the complete webinar data with panelists at top level for easier access
        const webinarData = {
          ...rawData,
          // Make sure panelists is available at the top level
          panelists: rawData?.panelists || [],
          // Include database fields that might not be in raw_data
          id: dbWebinar.webinar_id,
          webinar_id: dbWebinar.webinar_id,
          webinar_uuid: dbWebinar.webinar_uuid,
          last_synced_at: dbWebinar.last_synced_at
        };
        
        console.log(`[useZoomWebinarDetails] Processed webinar data:`, webinarData);
        return webinarData;
      }
      
      console.log(`[useZoomWebinarDetails] Webinar not found in database, fetching from API`);
      
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
