
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ZoomParticipants } from './types';
import { fetchParticipantsFromDatabase } from './services/databaseQueries';

export function useZoomWebinarParticipants(webinarId: string | null) {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['zoom-participants', user?.id, webinarId],
    queryFn: async () => {
      if (!user || !webinarId) return { registrants: [], attendees: [] };
      
      console.log(`[useZoomWebinarParticipants] Fetching participants for webinar: ${webinarId}`);
      
      // FIXED: Always try database first and get accurate counts
      const dbResult = await fetchParticipantsFromDatabase(user.id, webinarId);
      
      if (dbResult && (dbResult.registrants.length > 0 || dbResult.attendees.length > 0)) {
        console.log(`[useZoomWebinarParticipants] Found participants in database: ${dbResult.registrants.length} registrants, ${dbResult.attendees.length} attendees`);
        return {
          registrants: dbResult.registrants,
          attendees: dbResult.attendees
        };
      }
      
      // If not in database, fetch from API as fallback
      console.log(`[useZoomWebinarParticipants] No participants in database, fetching from API for webinar: ${webinarId}`);
      
      const { data: apiData, error: apiError } = await supabase.functions.invoke('zoom-api', {
        body: { action: 'get-participants', id: webinarId }
      });
      
      if (apiError) {
        console.error(`[useZoomWebinarParticipants] API error:`, apiError);
        throw new Error(apiError.message);
      }
      
      console.log(`[useZoomWebinarParticipants] API returned:`, apiData);
      return apiData as ZoomParticipants;
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
