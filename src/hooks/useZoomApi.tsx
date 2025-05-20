
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ZoomWebinar {
  id: string;
  uuid: string;
  topic: string;
  start_time: string;
  duration: number;
  timezone: string;
  agenda: string;
  host_email: string;
  status: string;
  type: number;
}

export interface ZoomParticipants {
  registrants: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    create_time: string;
    join_url: string;
    status: string;
  }>;
  attendees: Array<{
    id: string;
    name: string;
    user_email: string;
    join_time: string;
    leave_time: string;
    duration: number;
  }>;
}

export function useZoomWebinars() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);

  const { data, error, refetch } = useQuery({
    queryKey: ['zoom-webinars'],
    queryFn: async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke('zoom-api', {
          body: { action: 'list-webinars' }
        });
        
        if (error) {
          console.error('Supabase function error:', error);
          throw new Error(error.message || 'Failed to invoke Zoom API function');
        }
        
        if (data.error) {
          console.error('Zoom API error in response:', data.error);
          throw new Error(data.error);
        }
        
        // Add logging for debugging
        console.log('Webinars API response:', data);
        
        return data.webinars;
      } catch (err: any) {
        console.error('Error fetching webinars:', err);
        
        let errorMessage = err.message || 'An error occurred while fetching webinars';
        
        // Provide more helpful error messages
        if (errorMessage.includes('credentials') || errorMessage.includes('token')) {
          errorMessage = 'Zoom authentication failed. Please check your API credentials in Supabase.';
        } else if (errorMessage.includes('capabilities')) {
          errorMessage = 'Your Zoom account does not have webinar capabilities enabled. This requires a paid Zoom plan.';
        }
        
        toast({
          title: 'Failed to fetch webinars',
          description: errorMessage,
          variant: 'destructive'
        });
        
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

  const refreshWebinars = async () => {
    setIsRefetching(true);
    try {
      await refetch();
      toast({
        title: 'Webinars refreshed',
        description: 'Webinar data has been updated from Zoom'
      });
    } catch (err) {
      // Error already handled in query function
    } finally {
      setIsRefetching(false);
    }
  };

  return {
    webinars: data || [],
    isLoading,
    isRefetching,
    error,
    refreshWebinars
  };
}

export function useZoomWebinarDetails(webinarId: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['zoom-webinar', webinarId],
    queryFn: async () => {
      if (!webinarId) return null;
      
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { action: 'get-webinar', id: webinarId }
      });
      
      if (error) throw new Error(error.message);
      return data.webinar;
    },
    enabled: !!webinarId,
    refetchOnWindowFocus: false
  });

  return {
    webinar: data,
    isLoading,
    error
  };
}

export function useZoomWebinarParticipants(webinarId: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['zoom-participants', webinarId],
    queryFn: async () => {
      if (!webinarId) return { registrants: [], attendees: [] };
      
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { action: 'get-participants', id: webinarId }
      });
      
      if (error) throw new Error(error.message);
      return data as ZoomParticipants;
    },
    enabled: !!webinarId,
    refetchOnWindowFocus: false
  });

  return {
    participants: data || { registrants: [], attendees: [] },
    isLoading,
    error
  };
}
