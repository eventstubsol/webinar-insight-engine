
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useSingleWebinarSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingWebinarId, setSyncingWebinarId] = useState<string | null>(null);

  const syncWebinar = async (webinarId: string) => {
    if (!user || isSyncing) return;

    setIsSyncing(true);
    setSyncingWebinarId(webinarId);

    try {
      console.log(`[useSingleWebinarSync] Starting enhanced sync for webinar: ${webinarId}`);
      
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'sync-single-webinar',
          webinar_id: webinarId
        }
      });

      if (error) {
        console.error('[useSingleWebinarSync] Sync error:', error);
        throw new Error(error.message || 'Failed to sync webinar');
      }

      if (data.error) {
        console.error('[useSingleWebinarSync] API error:', data.error);
        throw new Error(data.error);
      }

      // Invalidate relevant queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['zoom-webinar-details', webinarId] });
      await queryClient.invalidateQueries({ queryKey: ['zoom-webinar-instances', user.id, webinarId] });

      // Show success message with enhanced details
      if (data.summary) {
        const message = `Enhanced sync completed: ${data.summary.webinarUpdated ? 'Webinar updated' : 'No changes needed'}`;
        const details = data.summary.instancesUpdated ? `, ${data.summary.instancesUpdated} instances updated` : '';
        
        toast({
          title: 'Webinar synced',
          description: `${message}${details}`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Webinar synced',
          description: 'Enhanced webinar data has been updated',
          variant: 'default'
        });
      }

      console.log(`[useSingleWebinarSync] Enhanced sync completed for webinar: ${webinarId}`, data);
    } catch (error: any) {
      console.error('[useSingleWebinarSync] Enhanced sync failed:', error);
      toast({
        title: 'Enhanced sync failed',
        description: error.message || 'Could not sync webinar data',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
      setSyncingWebinarId(null);
    }
  };

  const getLastSyncTime = async (webinarId: string): Promise<Date | null> => {
    if (!user) return null;

    try {
      const { data } = await supabase
        .from('zoom_sync_history')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('sync_type', 'single-webinar')
        .contains('sync_details', { webinar_id: webinarId })
        .order('created_at', { ascending: false })
        .limit(1);

      return data && data.length > 0 ? new Date(data[0].created_at) : null;
    } catch (error) {
      console.error('[useSingleWebinarSync] Error fetching last sync time:', error);
      return null;
    }
  };

  return {
    syncWebinar,
    isSyncing,
    syncingWebinarId,
    getLastSyncTime
  };
}
