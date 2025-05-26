import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { zoomApiClient } from './services/zoomApiClient';

export interface InstanceParticipants {
  registrants: any[];
  attendees: any[];
}

export function useZoomInstanceParticipants(webinarId: string | null, instanceId: string | null) {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['zoom-instance-participants', user?.id, webinarId, instanceId],
    queryFn: async () => {
      if (!user || !webinarId || !instanceId) return { registrants: [], attendees: [] };
      
      // Try to get from database first
      const { data: dbInstance } = await supabase
        .from('zoom_webinar_instances')
        .select('id')
        .eq('webinar_id', webinarId)
        .eq('instance_id', instanceId)
        .single();
        
      if (!dbInstance) {
        console.error('[useZoomInstanceParticipants] Could not find instance in database');
        return { registrants: [], attendees: [] };
      }
      
      const { data: dbParticipants, error: dbError } = await supabase
        .from('zoom_webinar_instance_participants')
        .select('*')
        .eq('user_id', user.id)
        .eq('instance_id', dbInstance.id);
      
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
      try {
        return await zoomApiClient.getInstanceParticipants(webinarId, instanceId);
      } catch (apiError) {
        console.error('[useZoomInstanceParticipants] API error:', apiError);
        return { registrants: [], attendees: [] };
      }
    },
    enabled: !!user && !!webinarId && !!instanceId,
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
