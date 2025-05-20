
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useZoomCredentials } from './useZoomCredentials';
import { ZoomWebinar } from './types';

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
        console.log('[useZoomWebinars] Fetching webinars from database or API');
        
        // Try to get webinars from database first
        const { data: dbWebinars, error: dbError } = await supabase
          .from('zoom_webinars')
          .select('*')
          .eq('user_id', user.id)
          .order('start_time', { ascending: false });
        
        // If we have webinars in the database, return them immediately
        if (!dbError && dbWebinars && dbWebinars.length > 0) {
          console.log(`[useZoomWebinars] Found ${dbWebinars.length} webinars in database`);
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
        } else {
          console.log('[useZoomWebinars] No webinars found in database, fetching from API');
        }
        
        // If not in database or database fetch failed, try API
        const { data, error } = await supabase.functions.invoke('zoom-api', {
          body: { action: 'list-webinars' }
        });
        
        if (error) {
          console.error('[useZoomWebinars] Supabase function invocation error:', error);
          throw new Error(error.message || 'Failed to invoke Zoom API function');
        }
        
        if (data.error) {
          console.error('[useZoomWebinars] Zoom API error in response:', data.error);
          throw new Error(data.error);
        }
        
        console.log('[useZoomWebinars] API response:', data);
        
        return data.webinars || [];
      } catch (err: any) {
        console.error('[useZoomWebinars] Error fetching webinars:', err);
        
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });

  const refreshWebinars = async (force: boolean = false) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to refresh webinars',
        variant: 'destructive'
      });
      return;
    }
    
    setIsRefetching(true);
    console.log(`[refreshWebinars] Starting refresh with force=${force}`);
    
    try {
      // Make the API call to fetch fresh data from Zoom
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'list-webinars',
          force_sync: force 
        }
      });
      
      if (refreshError) {
        console.error('[refreshWebinars] Error during refresh:', refreshError);
        toast({
          title: 'Sync failed',
          description: refreshError.message || 'Failed to sync with Zoom API',
          variant: 'destructive'
        });
        throw refreshError;
      }
      
      if (refreshData.error) {
        console.error('[refreshWebinars] API returned error:', refreshData.error);
        toast({
          title: 'Sync failed',
          description: refreshData.error,
          variant: 'destructive'
        });
        throw new Error(refreshData.error);
      }
      
      console.log('[refreshWebinars] Sync completed successfully:', refreshData);
      
      // Show appropriate toast based on sync results
      if (refreshData.syncResults) {
        if (refreshData.syncResults.itemsUpdated > 0) {
          toast({
            title: 'Webinars synced',
            description: `Successfully updated ${refreshData.syncResults.itemsUpdated} webinars from Zoom`,
            variant: 'success'
          });
        } else {
          toast({
            title: 'No changes found',
            description: 'No webinar changes detected in your Zoom account',
          });
        }
      } else {
        toast({
          title: 'Webinars synced',
          description: 'Webinar data has been updated from Zoom'
        });
      }

      // Invalidate the query cache to force a refresh
      await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', user.id] });
      
      // Trigger a refetch to get the latest data
      const refetchResult = await refetch();
      return refetchResult.data;
    } catch (err: any) {
      console.error('[refreshWebinars] Error during refresh:', err);
      // Error handling already done above
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
