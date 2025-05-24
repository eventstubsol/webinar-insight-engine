
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchWebinarRecurrence } from './services/enhancedDataService';
import { ZoomWebinarRecurrence } from './types';

interface UseZoomWebinarRecurrenceProps {
  webinarId?: string;
}

export function useZoomWebinarRecurrence({ webinarId }: UseZoomWebinarRecurrenceProps = {}) {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['zoom-webinar-recurrence', user?.id, webinarId],
    queryFn: async () => {
      if (!user) return [];
      return await fetchWebinarRecurrence(user.id, webinarId);
    },
    enabled: !!user,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });

  return {
    recurrenceData: (data || []) as ZoomWebinarRecurrence[],
    isLoading,
    error: error as Error | null,
    refetch
  };
}
