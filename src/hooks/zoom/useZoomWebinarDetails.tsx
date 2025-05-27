
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useZoomWebinarDetails(webinarId: string | null) {
  const { user } = useAuth();
  
  const { data, isLoading, error, refetch } = useQuery({
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
        
        // Create webinar data with proper field precedence
        // Database fields should take precedence over raw_data fields
        const webinarData = {
          // Start with raw_data
          ...rawData,
          // Override with database fields (these should take precedence)
          id: dbWebinar.webinar_id,
          webinar_id: dbWebinar.webinar_id,
          webinar_uuid: dbWebinar.webinar_uuid,
          topic: dbWebinar.topic,
          start_time: dbWebinar.start_time,
          duration: dbWebinar.duration,
          timezone: dbWebinar.timezone,
          agenda: dbWebinar.agenda,
          host_email: dbWebinar.host_email,
          host_id: dbWebinar.host_id,
          host_name: dbWebinar.host_name,
          host_first_name: dbWebinar.host_first_name,
          host_last_name: dbWebinar.host_last_name,
          status: dbWebinar.status,
          type: dbWebinar.type,
          last_synced_at: dbWebinar.last_synced_at,
          // Enhanced timing data
          actual_duration: dbWebinar.actual_duration,
          actual_start_time: dbWebinar.actual_start_time,
          // Ensure panelists is available at the top level for easier access
          panelists: rawData?.panelists || [],
        };
        
        console.log(`[useZoomWebinarDetails] Processed webinar data:`, {
          id: webinarData.id,
          host_email: webinarData.host_email,
          host_id: webinarData.host_id,
          host_name: webinarData.host_name,
          host_first_name: webinarData.host_first_name,
          host_last_name: webinarData.host_last_name,
          panelists_count: webinarData.panelists?.length || 0,
          raw_data_keys: Object.keys(rawData || {})
        });
        
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
    error,
    refetch
  };
}
