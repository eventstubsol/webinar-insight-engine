
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ZoomParticipants } from './types';

export function useZoomWebinarParticipants(webinarId: string | null) {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['zoom-participants', user?.id, webinarId],
    queryFn: async () => {
      if (!user || !webinarId) return { registrants: [], attendees: [] };
      
      // Try to get from database first
      const { data: dbParticipants, error: dbError } = await supabase
        .from('zoom_webinar_participants')
        .select('*')
        .eq('user_id', user.id)
        .eq('webinar_id', webinarId);
      
      if (!dbError && dbParticipants && dbParticipants.length > 0) {
        // Transform to expected format
        const registrants = dbParticipants
          .filter(p => p.participant_type === 'registrant')
          .map(p => p.raw_data);
        
        const attendees = dbParticipants
          .filter(p => p.participant_type === 'attendee')
          .map(p => p.raw_data);
        
        return { registrants, attendees };
      }
      
      // If not in database, fetch from API
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { action: 'get-participants', id: webinarId }
      });
      
      if (error) throw new Error(error.message);
      return data as ZoomParticipants;
    },
    enabled: !!user && !!webinarId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000 // 15 minutes
  });

  return {
    participants: data || { registrants: [], attendees: [] },
    isLoading,
    error
  };
}
