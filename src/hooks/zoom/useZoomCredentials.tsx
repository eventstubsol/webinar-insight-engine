import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ZoomCredentialsStatus } from './types';

export function useZoomCredentials() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const { data, error, refetch, isInitialLoading } = useQuery({
    queryKey: ['zoom-credentials-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      try {
        // Check if we're in a development environment
        const isDevelopment = import.meta.env.DEV;
        
        if (isDevelopment) {
          console.log('Using mock credentials status in development environment');
          // Return mock data in development to avoid Edge Function errors
          return {
            hasCredentials: false,
            isVerified: false,
            lastVerified: null
          } as ZoomCredentialsStatus;
        }
        
        const { data, error } = await supabase.functions.invoke('zoom-api', {
          body: { action: 'check-credentials-status' }
        });
        
        if (error) throw error;
        return data as ZoomCredentialsStatus;
      } catch (err: any) {
        console.error('Error checking credentials status:', err);
        // Return a default status object instead of throwing
        return {
          hasCredentials: false,
          isVerified: false,
          lastVerified: null
        } as ZoomCredentialsStatus;
      }
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Always fetch fresh data when component mounts
    staleTime: 30 * 1000, // Reduce stale time to 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Only retry once to avoid excessive failed requests
  });
  
  const checkCredentialsStatus = async () => {
    if (!user) return null;
    
    try {
      setIsLoading(true);
      const result = await refetch();
      return result.data;
    } catch (err) {
      console.error('Failed to check credentials status:', err);
      return {
        hasCredentials: false,
        isVerified: false,
        lastVerified: null
      } as ZoomCredentialsStatus;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    credentialsStatus: data || {
      hasCredentials: false,
      isVerified: false,
      lastVerified: null
    },
    checkCredentialsStatus,
    isLoading: isLoading || isInitialLoading, // Combine both loading states
    error
  };
}