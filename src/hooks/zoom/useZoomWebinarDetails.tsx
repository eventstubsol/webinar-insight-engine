
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
        
        // Check if webinar needs enhancement (missing host data)
        const needsEnhancement = !dbWebinar.host_email || !dbWebinar.host_name;
        
        if (needsEnhancement) {
          console.log(`[useZoomWebinarDetails] Webinar needs enhancement, triggering on-demand enhancement`);
          
          // Trigger enhancement in background
          const { data: enhancementData, error: enhancementError } = await supabase.functions.invoke('zoom-api', {
            body: { 
              action: 'enhance-single-webinar',
              webinar_id: webinarId
            }
          });
          
          if (enhancementError) {
            console.error('[useZoomWebinarDetails] Enhancement failed:', enhancementError);
            // Continue with existing data even if enhancement fails
          } else if (enhancementData?.webinar) {
            console.log('[useZoomWebinarDetails] Enhancement successful, using enhanced data');
            // Use enhanced data
            const enhancedWebinar = enhancementData.webinar;
            
            // Safely access raw_data with proper typing
            const rawData = enhancedWebinar.raw_data as any;
            
            return {
              // Start with raw_data
              ...rawData,
              // Override with database fields (these should take precedence)
              id: enhancedWebinar.webinar_id,
              webinar_id: enhancedWebinar.webinar_id,
              webinar_uuid: enhancedWebinar.webinar_uuid,
              topic: enhancedWebinar.topic,
              start_time: enhancedWebinar.start_time,
              duration: enhancedWebinar.duration,
              timezone: enhancedWebinar.timezone,
              agenda: enhancedWebinar.agenda,
              host_email: enhancedWebinar.host_email,
              host_id: enhancedWebinar.host_id,
              host_name: enhancedWebinar.host_name,
              host_first_name: enhancedWebinar.host_first_name,
              host_last_name: enhancedWebinar.host_last_name,
              status: enhancedWebinar.status,
              type: enhancedWebinar.type,
              last_synced_at: enhancedWebinar.last_synced_at,
              // Ensure panelists is available at the top level for easier access
              panelists: rawData?.panelists || [],
              _enhanced: true
            };
          }
        }
        
        // Use existing data (possibly not fully enhanced)
        const rawData = dbWebinar.raw_data as any;
        
        // Create webinar data with proper field precedence
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
          // Ensure panelists is available at the top level for easier access
          panelists: rawData?.panelists || [],
          _enhanced: !needsEnhancement
        };
        
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
