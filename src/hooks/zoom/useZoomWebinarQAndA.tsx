
import { useQuery } from '@tanstack/react-query';
import { ZoomDataService } from './services/ZoomDataService';
import { useAuth } from '@/hooks/useAuth';

export interface ZoomWebinarQuestion {
  id: string;
  question_id: string;
  question: string;
  answer?: string;
  name?: string;
  email?: string;
  question_time?: string;
  answer_time?: string;
  answered: boolean;
  answered_by?: string;
}

export interface ZoomWebinarQAndAResult {
  questions: ZoomWebinarQuestion[];
  totalQuestions: number;
  answeredQuestions: number;
}

export function useZoomWebinarQAndA(webinarId: string | null) {
  const { user } = useAuth();
  
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['zoom-webinar-qanda', user?.id, webinarId],
    queryFn: async () => {
      if (!user || !webinarId) return { questions: [], totalQuestions: 0, answeredQuestions: 0 };
      
      return await ZoomDataService.fetchWebinarQAndA(user.id, webinarId);
    },
    enabled: !!user && !!webinarId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes
  });

  return {
    questions: data?.questions || [],
    totalQuestions: data?.totalQuestions || 0,
    answeredQuestions: data?.answeredQuestions || 0,
    isLoading,
    isRefetching,
    error,
    refetch
  };
}
