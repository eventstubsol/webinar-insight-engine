
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ZoomParticipants } from './types';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useZoomWebinarParticipants(webinarId: string | null) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['zoom-webinar-participants', user?.id, webinarId, workspaceId],
    queryFn: async () => {
      if (!user || !webinarId) return { registrants: [], attendees: [] };
      
      // First try to get from database
      let registrantsQuery = supabase
        .from('zoom_webinar_participants')
        .select('*')
        .eq('user_id', user.id)
        .eq('webinar_id', webinarId)
        .eq('participant_type', 'registrant');
        
      let attendeesQuery = supabase
        .from('zoom_webinar_participants')
        .select('*')
        .eq('user_id', user.id)
        .eq('webinar_id', webinarId)
        .eq('participant_type', 'attendee');
      
      // Add workspace filtering if available
      if (workspaceId) {
        registrantsQuery = registrantsQuery.eq('workspace_id', workspaceId);
        attendeesQuery = attendeesQuery.eq('workspace_id', workspaceId);
      }
      
      const { data: registrants, error: registrantsError } = await registrantsQuery;
      const { data: attendees, error: attendeesError } = await attendeesQuery;
      
      // If we have data in the database, use it
      if (!registrantsError && !attendeesError && 
          ((registrants && registrants.length > 0) || 
           (attendees && attendees.length > 0))) {
        return {
          registrants: registrants || [],
          attendees: attendees || []
        };
      }
      
      // If not in database, fetch from API
      const params: Record<string, any> = { 
        action: 'get-participants',
        id: webinarId
      };
      
      // Add workspace context if available
      if (workspaceId) {
        params.workspace_id = workspaceId;
      }
      
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: params
      });
      
      if (error) throw new Error(error.message);
      
      return {
        registrants: data.registrants || [],
        attendees: data.attendees || []
      };
    },
    enabled: !!user && !!webinarId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes
  });

  return {
    participants: data || { registrants: [], attendees: [] } as ZoomParticipants,
    isLoading,
    isRefetching,
    error,
    refetch
  };
}
