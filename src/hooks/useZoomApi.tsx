
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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

interface ZoomCredentialsStatus {
  hasCredentials: boolean;
  isVerified: boolean;
  lastVerified: string | null;
}

export function useZoomCredentials() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const { data, error, refetch } = useQuery({
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
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    isLoading,
    error
  };
}

export function useZoomCredentialsVerification() {
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [scopesError, setScopesError] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  
  const verifyCredentials = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to verify Zoom credentials',
        variant: 'destructive'
      });
      return false;
    }
    
    setIsVerifying(true);
    setScopesError(false);
    setVerificationDetails(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { action: 'verify-credentials' }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.success) {
        setVerified(true);
        setVerificationDetails(data);
        toast({
          title: 'Zoom API Connected',
          description: `Successfully connected as ${data.user?.email || 'Zoom User'}.`
        });
        return true;
      } else {
        // Check if it's specifically a scopes error
        if (data.code === 'missing_scopes' || 
            data.error?.toLowerCase().includes('scopes') || 
            data.details?.code === 4711) {
          setScopesError(true);
        }
        
        throw new Error(data.error || 'Verification failed');
      }
    } catch (err: any) {
      console.error('Verification error details:', err);
      
      // Check if the error message mentions scopes
      if (err.message?.toLowerCase().includes('scopes') || 
          err.message?.toLowerCase().includes('scope') || 
          (err.response?.data && err.response.data.code === 4711)) {
        setScopesError(true);
      }
      
      toast({
        title: 'Verification Failed',
        description: err.message || 'Could not verify Zoom API credentials',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsVerifying(false);
    }
  };
  
  return {
    verifyCredentials,
    isVerifying,
    verified,
    scopesError,
    verificationDetails
  };
}

export function useZoomWebinars() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const { credentialsStatus } = useZoomCredentials();

  const { data, error, refetch } = useQuery({
    queryKey: ['zoom-webinars', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        setIsLoading(true);
        
        // Try to get webinars from database first
        const { data: dbWebinars, error: dbError } = await supabase
          .from('zoom_webinars')
          .select('*')
          .eq('user_id', user.id)
          .order('start_time', { ascending: false });
        
        // If we have webinars in the database, return them immediately
        if (!dbError && dbWebinars && dbWebinars.length > 0) {
          // Transform to ZoomWebinar format
          return dbWebinars.map(item => ({
            id: item.webinar_id,
            uuid: item.webinar_uuid,
            topic: item.topic,
            start_time: item.start_time,
            duration: item.duration,
            timezone: item.timezone,
            agenda: item.agenda,
            host_email: item.host_email,
            status: item.status,
            type: item.type,
            // Fix the spread operator issue by ensuring raw_data is an object
            ...(typeof item.raw_data === 'object' ? item.raw_data : {})
          }));
        }
        
        // If not in database or database fetch failed, try API
        const { data, error } = await supabase.functions.invoke('zoom-api', {
          body: { action: 'list-webinars' }
        });
        
        if (error) {
          console.error('Supabase function invocation error:', error);
          throw new Error(error.message || 'Failed to invoke Zoom API function');
        }
        
        if (data.error) {
          console.error('Zoom API error in response:', data.error);
          throw new Error(data.error);
        }
        
        console.log('Webinars API response:', data);
        
        return data.webinars || [];
      } catch (err: any) {
        console.error('Error fetching webinars:', err);
        
        // Parse and enhance error messages for better user experience
        let errorMessage = err.message || 'An error occurred while fetching webinars';
        
        // Provide more helpful error messages based on common patterns
        if (errorMessage.includes('credentials not configured')) {
          errorMessage = 'Zoom credentials not configured. Please complete the Zoom setup wizard.';
        } else if (errorMessage.includes('capabilities')) {
          errorMessage = 'Your Zoom account does not have webinar capabilities enabled. This requires a paid Zoom plan.';
        } else if (errorMessage.includes('scopes') || errorMessage.includes('scope') || errorMessage.includes('4711')) {
          errorMessage = 'Missing required OAuth scopes in your Zoom App. Update your Zoom Server-to-Server OAuth app to include: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin';
        }
        
        toast({
          title: 'Failed to fetch webinars',
          description: errorMessage,
          variant: 'destructive'
        });
        
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    enabled: !!user && !!credentialsStatus?.hasCredentials,
    retry: 1,
    refetchOnWindowFocus: false,
    // Add staleTime and cacheTime for optimized caching
    staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh for 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes - keep data in cache for 10 minutes
  });

  const refreshWebinars = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to refresh webinars',
        variant: 'destructive'
      });
      return;
    }
    
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
  
  // Get user's sync history
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchSyncHistory = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('zoom_sync_history')
          .select('*')
          .eq('user_id', user.id)
          .eq('sync_type', 'webinars')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!error && data) {
          setSyncHistory(data);
        }
      } catch (err) {
        console.error('Error fetching sync history:', err);
      }
    };
    
    fetchSyncHistory();
  }, [user, data]); // Refresh history when webinars data changes
  
  // Get last sync time from sync history
  const lastSyncTime = syncHistory.length > 0 
    ? new Date(syncHistory[0].created_at) 
    : null;
  
  const errorDetails = {
    isMissingCredentials: (!credentialsStatus?.hasCredentials) ||
                         error?.message?.includes('credentials not configured'),
    isCapabilitiesError: error?.message?.includes('capabilities'),
    isScopesError: error?.message?.includes('scopes') || 
                 error?.message?.includes('scope') || 
                 error?.message?.includes('4711'),
    missingSecrets: []
  };

  return {
    webinars: data || [],
    isLoading,
    isRefetching,
    error,
    errorDetails,
    refreshWebinars,
    syncHistory,
    lastSyncTime,
    credentialsStatus
  };
}

export function useZoomWebinarDetails(webinarId: string | null) {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['zoom-webinar', user?.id, webinarId],
    queryFn: async () => {
      if (!user || !webinarId) return null;
      
      // Try to get from database first
      const { data: dbWebinar, error: dbError } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id)
        .eq('webinar_id', webinarId)
        .single();
      
      if (!dbError && dbWebinar) {
        return dbWebinar.raw_data;
      }
      
      // If not in database, fetch from API
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { action: 'get-webinar', id: webinarId }
      });
      
      if (error) throw new Error(error.message);
      return data.webinar;
    },
    enabled: !!user && !!webinarId,
    refetchOnWindowFocus: false,
    // Add optimized caching parameters
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes
  });

  return {
    webinar: data,
    isLoading,
    error
  };
}

export function useZoomWebinarParticipants(webinarId: string | null) {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['zoom-participants', user?.id, webinarId],
    queryFn: async () => {
      if (!user || !webinarId) return { registrants: [], attendees: [] };
      
      // Try to get from database first
      const { data: dbParticipants, error: dbError } = await supabase
        .from('zoom_webinar_participants')
        .select('*')
        .eq('user_id', user.id)
        .eq('webinar_id', webinarId);
      
      if (!dbError && dbParticipants && dbParticipants.length > 0) {
        // Transform to expected format
        const registrants = dbParticipants
          .filter(p => p.participant_type === 'registrant')
          .map(p => p.raw_data);
        
        const attendees = dbParticipants
          .filter(p => p.participant_type === 'attendee')
          .map(p => p.raw_data);
        
        return { registrants, attendees };
      }
      
      // If not in database, fetch from API
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { action: 'get-participants', id: webinarId }
      });
      
      if (error) throw new Error(error.message);
      return data as ZoomParticipants;
    },
    enabled: !!user && !!webinarId,
    refetchOnWindowFocus: false,
    // Add optimized caching parameters
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000 // 15 minutes
  });

  return {
    participants: data || { registrants: [], attendees: [] },
    isLoading,
    error
  };
}
