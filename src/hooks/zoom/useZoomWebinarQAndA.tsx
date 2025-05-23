
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WebinarQuestion {
  id: string;
  webinar_id: string;
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

interface WebinarQAndAData {
  questions: WebinarQuestion[];
  totalQuestions: number;
  answeredQuestions: number;
}

export const useZoomWebinarQAndA = (webinarId: string | null) => {
  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch
  } = useQuery({
    queryKey: ['webinar', webinarId, 'qanda'],
    queryFn: async (): Promise<WebinarQAndAData> => {
      if (!webinarId) {
        return { questions: [], totalQuestions: 0, answeredQuestions: 0 };
      }

      const { data, error } = await supabase
        .from('zoom_webinar_questions')
        .select('*')
        .eq('webinar_id', webinarId)
        .order('question_time', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch Q&A data: ${error.message}`);
      }

      const questions = data || [];
      const answeredQuestions = questions.filter(q => q.answered).length;

      return {
        questions,
        totalQuestions: questions.length,
        answeredQuestions
      };
    },
    enabled: !!webinarId,
    refetchOnWindowFocus: false
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
};
