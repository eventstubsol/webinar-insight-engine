
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchWebinarTrackingFields } from './services/webinarApiService';
import { ZoomWebinarTrackingField } from './types';

interface UseZoomWebinarTrackingFieldsProps {
  webinarId?: string;
}

export function useZoomWebinarTrackingFields({ webinarId }: UseZoomWebinarTrackingFieldsProps = {}) {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['zoom-webinar-tracking-fields', user?.id, webinarId],
    queryFn: async () => {
      if (!user) return [];
      return await fetchWebinarTrackingFields(user.id, webinarId);
    },
    enabled: !!user,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });

  return {
    trackingFields: (data || []) as ZoomWebinarTrackingField[],
    isLoading,
    error: error as Error | null,
    refetch
  };
}
