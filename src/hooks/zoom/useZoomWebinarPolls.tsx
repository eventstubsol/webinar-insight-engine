
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PollQuestion {
  name: string;
  type: string;
  answers: string[];
  answersCount: number[];
  totalAnswers: number;
}

export interface Poll {
  poll_id: string;
  title: string;
  questions: PollQuestion[];
  status: string;
  total_participants: number;
  start_time?: string;
}

export interface WebinarPollsData {
  polls: Poll[];
  totalPolls: number;
  totalParticipants: number;
}

export const useZoomWebinarPolls = (webinarId: string | null) => {
  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch
  } = useQuery({
    queryKey: ['webinar', webinarId, 'polls'],
    queryFn: async (): Promise<WebinarPollsData> => {
      if (!webinarId) {
        return { polls: [], totalPolls: 0, totalParticipants: 0 };
      }

      // Fetch polls
      const { data: pollsData, error: pollsError } = await supabase
        .from('zoom_webinar_polls')
        .select('*')
        .eq('webinar_id', webinarId)
        .order('start_time', { ascending: false });

      if (pollsError) {
        throw new Error(`Failed to fetch polls data: ${pollsError.message}`);
      }

      // Fetch poll responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('zoom_webinar_poll_responses')
        .select('*')
        .eq('webinar_id', webinarId);

      if (responsesError) {
        throw new Error(`Failed to fetch poll responses: ${responsesError.message}`);
      }

      // Process the data to add response stats
      const polls = pollsData?.map(poll => {
        // Extract questions from the raw data
        const rawQuestions = poll.questions || [];
        
        // Process each question to add response stats
        const questions = Array.isArray(rawQuestions) ? rawQuestions.map((q: any) => {
          const questionResponses = responsesData?.filter((r: any) => {
            return r.responses?.some((resp: any) => resp.question_id === q.id);
          }) || [];

          // Count answers for each option
          const answerCounts: Record<string, number> = {};
          let totalAnswers = 0;

          questionResponses.forEach((response: any) => {
            const qResponse = response.responses?.find((r: any) => r.question_id === q.id);
            if (qResponse) {
              // Handle both single and multiple answers
              const answers = Array.isArray(qResponse.answer) ? qResponse.answer : [qResponse.answer];
              answers.forEach((answer: string) => {
                answerCounts[answer] = (answerCounts[answer] || 0) + 1;
                totalAnswers++;
              });
            }
          });

          return {
            id: q.id,
            name: q.name,
            type: q.type,
            answers: q.options || [],
            answersCount: (q.options || []).map((opt: string) => answerCounts[opt] || 0),
            totalAnswers
          };
        }) : [];

        return {
          poll_id: poll.poll_id,
          title: poll.title,
          questions,
          status: poll.status,
          total_participants: poll.total_participants || 0,
          start_time: poll.start_time
        };
      }) || [];

      // Calculate totals
      const totalParticipants = polls.reduce((total, poll) => total + (poll.total_participants || 0), 0);

      return {
        polls,
        totalPolls: polls.length,
        totalParticipants
      };
    },
    enabled: !!webinarId,
    refetchOnWindowFocus: false
  });

  return {
    polls: data?.polls || [],
    totalPolls: data?.totalPolls || 0,
    totalParticipants: data?.totalParticipants || 0,
    isLoading,
    isRefetching,
    error,
    refetch
  };
};
