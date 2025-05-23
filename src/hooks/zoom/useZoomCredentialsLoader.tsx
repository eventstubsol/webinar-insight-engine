
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ZoomCredentials } from './types';

export function useZoomCredentialsLoader() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const fetchInProgress = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { 
    data, 
    error, 
    isInitialLoading,
    refetch
  } = useQuery({
    queryKey: ['zoom-saved-credentials', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Prevent concurrent fetches
      if (fetchInProgress.current) {
        console.log('Fetch already in progress, skipping duplicate request');
        return null;
      }
      
      try {
        fetchInProgress.current = true;
        
        // Set timeout to cancel long-running requests
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          console.log('Request timeout reached, aborting');
          fetchInProgress.current = false;
          throw new Error('Request timed out');
        }, 10000); // Reduced to 10 seconds timeout for faster feedback
        
        const { data, error } = await supabase.functions.invoke('zoom-api', {
          body: { action: 'get-credentials' }
        });
        
        // Clear the timeout if request completes successfully
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        if (error) throw error;
        return data as {
          hasCredentials: boolean;
          credentials?: ZoomCredentials;
        };
      } catch (err: any) {
        console.error('Error fetching saved credentials:', err);
        throw new Error(err.message || 'Failed to fetch credentials');
      } finally {
        // Set a small delay before allowing another fetch
        setTimeout(() => {
          fetchInProgress.current = false;
        }, 1000);
      }
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    retry: 2, // Limit retries to prevent cascading failures
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10000), // Exponential backoff
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      fetchInProgress.current = false;
    };
  }, []);
  
  const fetchSavedCredentials = async () => {
    if (!user) return null;
    
    // Don't allow fetch if another is already in progress
    if (fetchInProgress.current) {
      console.log('Fetch already in progress, skipping manual fetch request');
      return null;
    }
    
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
