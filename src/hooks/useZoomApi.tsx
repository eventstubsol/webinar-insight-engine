import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

// Storage key for saving sync history in localStorage
const SYNC_HISTORY_KEY = 'zoom_webinar_sync_history';

interface SyncRecord {
  timestamp: string;
  success: boolean;
  count: number;
  error?: string;
}

// Helper functions for sync history
const getSyncHistory = (): SyncRecord[] => {
  try {
    const history = localStorage.getItem(SYNC_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (e) {
    console.error('Error parsing sync history:', e);
    return [];
  }
};

const saveSyncRecord = (record: SyncRecord) => {
  try {
    const history = getSyncHistory();
    // Keep only the last 10 records
    const updatedHistory = [record, ...history].slice(0, 10);
    localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (e) {
    console.error('Error saving sync record:', e);
  }
};

export function useZoomCredentialsVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [scopesError, setScopesError] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  
  const verifyCredentials = async () => {
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
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const queryClient = useQueryClient();

  const { data, error, refetch } = useQuery({
    queryKey: ['zoom-webinars'],
    queryFn: async () => {
      try {
        setIsLoading(true);
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
        
        // Record successful sync in history
        saveSyncRecord({
          timestamp: new Date().toISOString(),
          success: true,
          count: data.webinars?.length || 0
        });
        
        return data.webinars;
      } catch (err: any) {
        console.error('Error fetching webinars:', err);
        
        // Parse and enhance error messages for better user experience
        let errorMessage = err.message || 'An error occurred while fetching webinars';
        
        // Record failed sync in history
        saveSyncRecord({
          timestamp: new Date().toISOString(),
          success: false,
          count: 0,
          error: errorMessage
        });
        
        // Provide more helpful error messages based on common patterns
        if (errorMessage.includes('Account ID')) {
          errorMessage = 'Zoom Account ID is missing or invalid. Please check your Supabase Edge Function secrets.';
        } else if (errorMessage.includes('client credentials') || errorMessage.includes('authentication failed')) {
          errorMessage = 'Zoom authentication failed. Please check your API credentials in Supabase Edge Function secrets.';
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
    retry: 1,
    refetchOnWindowFocus: false,
    // Add staleTime and cacheTime for optimized caching
    staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh for 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes - keep data in cache for 10 minutes
  });

  // Get sync history
  const syncHistory = getSyncHistory();

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
  
  const errorDetails = {
    isMissingCredentials: error?.message?.includes('credentials') || 
                         error?.message?.includes('Account ID') || 
                         error?.message?.includes('Client ID'),
    isCapabilitiesError: error?.message?.includes('capabilities'),
    isScopesError: error?.message?.includes('scopes') || 
                 error?.message?.includes('scope') || 
                 error?.message?.includes('4711'),
    missingSecrets: []
  };
  
  // Check which secrets might be missing from the error message
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes('account_id') || message.includes('account id')) 
      errorDetails.missingSecrets.push('ZOOM_ACCOUNT_ID');
    if (message.includes('client_id') || message.includes('client id')) 
      errorDetails.missingSecrets.push('ZOOM_CLIENT_ID');
    if (message.includes('client_secret') || message.includes('client secret')) 
      errorDetails.missingSecrets.push('ZOOM_CLIENT_SECRET');
  }

  return {
    webinars: data || [],
    isLoading,
    isRefetching,
    error,
    errorDetails,
    refreshWebinars,
    syncHistory
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
