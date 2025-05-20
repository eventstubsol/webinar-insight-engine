
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
        const { data, error } = await supabase.functions.invoke('zoom-api', {
          body: { action: 'check-credentials-status' }
        });
        
        if (error) throw error;
        return data as ZoomCredentialsStatus;
      } catch (err: any) {
        console.error('Error checking credentials status:', err);
        throw new Error(err.message || 'Failed to check credentials status');
      }
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Always fetch fresh data when component mounts
    staleTime: 30 * 1000, // Reduce stale time to 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const checkCredentialsStatus = async () => {
    if (!user) return null;
    
    try {
      setIsLoading(true);
      const result = await refetch();
      return result.data;
    } catch (err) {
      console.error('Failed to check credentials status:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    credentialsStatus: data,
    checkCredentialsStatus,
    isLoading: isLoading || isInitialLoading, // Combine both loading states
    error
  };
}
