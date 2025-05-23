
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ZoomCredentials } from './types';

/**
 * Custom hook to load and manage Zoom credentials
 */
export function useZoomCredentialsLoader() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const fetchInProgress = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Create a new AbortController when the component mounts
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    
    return () => {
      // Abort any pending requests when the component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      fetchInProgress.current = false;
    };
  }, []);
  
  // Function to reset state for a new request
  const prepareNewRequest = useCallback(() => {
    // Reset timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Reset abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    return abortControllerRef.current.signal;
  }, []);
  
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
        const signal = prepareNewRequest();
        
        // Set timeout to cancel long-running requests
        timeoutRef.current = setTimeout(() => {
          console.log('Request timeout reached, aborting');
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          fetchInProgress.current = false;
          throw new Error('Request timed out');
        }, 10000); // 10 seconds timeout for faster feedback
        
        // Add delay before actual request to avoid rapid repeated requests
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const { data, error } = await supabase.functions.invoke('zoom-api', {
          body: { action: 'get-credentials' }
        }, {
          abortSignal: signal
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
        // Don't report aborted request as an error
        if (err.name === 'AbortError') {
          console.log('Request was aborted');
          return null;
        }
        
        console.error('Error fetching saved credentials:', err);
        throw new Error(err.message || 'Failed to fetch credentials');
      } finally {
        // Set a small delay before allowing another fetch
        timeoutRef.current = setTimeout(() => {
          fetchInProgress.current = false;
          timeoutRef.current = null;
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
