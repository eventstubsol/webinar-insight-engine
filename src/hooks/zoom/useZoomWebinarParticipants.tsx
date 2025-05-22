
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ZoomParticipants } from './types';

export function useZoomWebinarParticipants(webinarId: string | null) {
  const { user } = useAuth();
  
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['zoom-webinar-participants', user?.id, webinarId],
    queryFn: async () => {
      if (!user || !webinarId) return { registrants: [], attendees: [] };
      
      // First try to get from database
      const { data: registrants, error: registrantsError } = await supabase
        .from('zoom_webinar_participants')
        .select('*')
        .eq('user_id', user.id)
        .eq('webinar_id', webinarId)
        .eq('participant_type', 'registrant');
        
      const { data: attendees, error: attendeesError } = await supabase
        .from('zoom_webinar_participants')
        .select('*')
        .eq('user_id', user.id)
        .eq('webinar_id', webinarId)
        .eq('participant_type', 'attendee');
      
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
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'get-participants',
          id: webinarId
        }
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
