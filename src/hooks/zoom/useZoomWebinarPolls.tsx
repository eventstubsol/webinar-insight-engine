
import { useQuery } from '@tanstack/react-query';
import { ZoomDataService } from './services/ZoomDataService';
import { useAuth } from '@/hooks/useAuth';

export interface ZoomWebinarPoll {
  id: string;
  poll_id: string;
  title: string;
  status?: string;
  questions?: any;
  total_participants: number;
  start_time?: string;
  end_time?: string;
}

export interface ZoomWebinarPollsResult {
  polls: ZoomWebinarPoll[];
  totalPolls: number;
  totalParticipants: number;
}

export function useZoomWebinarPolls(webinarId: string | null) {
  const { user } = useAuth();
  
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['zoom-webinar-polls', user?.id, webinarId],
    queryFn: async () => {
      if (!user || !webinarId) return { polls: [], totalPolls: 0, totalParticipants: 0 };
      
      return await ZoomDataService.fetchWebinarPolls(user.id, webinarId);
    },
    enabled: !!user && !!webinarId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes
  });

  return {
    polls: data,
    isLoading,
    isRefetching,
    error,
    refetch
  };
}
