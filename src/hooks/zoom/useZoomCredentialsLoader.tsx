
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ZoomCredentials } from './types';

export function useZoomCredentialsLoader() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    data, 
    error, 
    isInitialLoading,
    refetch
  } = useQuery({
    queryKey: ['zoom-saved-credentials', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      try {
        const { data, error } = await supabase.functions.invoke('zoom-api', {
          body: { action: 'get-credentials' }
        });
        
        if (error) throw error;
        return data as {
          hasCredentials: boolean;
          credentials?: ZoomCredentials;
        };
      } catch (err: any) {
        console.error('Error fetching saved credentials:', err);
        throw new Error(err.message || 'Failed to fetch credentials');
      }
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const fetchSavedCredentials = async () => {
    if (!user) return null;
    
    try {
      setIsLoading(true);
      const result = await refetch();
      return result.data;
    } catch (err) {
      console.error('Failed to fetch saved credentials:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    savedCredentials: data?.credentials,
    hasCredentials: !!data?.hasCredentials,
    isLoading: isLoading || isInitialLoading,
    error,
    fetchSavedCredentials
  };
}
