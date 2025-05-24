
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchWebinarOccurrences } from './services/webinarApiService';
import { ZoomWebinarOccurrence } from './types';

interface UseZoomWebinarOccurrencesProps {
  webinarId?: string;
}

export function useZoomWebinarOccurrences({ webinarId }: UseZoomWebinarOccurrencesProps = {}) {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['zoom-webinar-occurrences', user?.id, webinarId],
    queryFn: async () => {
      if (!user) return [];
      return await fetchWebinarOccurrences(user.id, webinarId);
    },
    enabled: !!user,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });

  return {
    occurrences: (data || []) as ZoomWebinarOccurrence[],
    isLoading,
    error: error as Error | null,
    refetch
  };
}
