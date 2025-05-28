
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { syncSingleWebinarOperation, getWebinarLastSyncTime } from './operations/singleWebinarOperations';

export function useSingleWebinarSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastSyncTimes, setLastSyncTimes] = useState<Record<string, Date | null>>({});

  const syncMutation = useMutation({
    mutationFn: async (webinarId: string) => {
      if (!user) throw new Error('User not authenticated');
      return syncSingleWebinarOperation(webinarId, user.id, queryClient);
    },
    onSuccess: (data, webinarId) => {
      // Update last sync time for this webinar
      setLastSyncTimes(prev => ({
        ...prev,
        [webinarId]: new Date()
      }));
    }
  });

  const syncWebinar = async (webinarId: string) => {
    try {
      await syncMutation.mutateAsync(webinarId);
    } catch (error) {
      // Error handling is done in the operation function
      console.error('[useSingleWebinarSync] Sync failed:', error);
    }
  };

  const getLastSyncTime = async (webinarId: string) => {
    if (!user) return null;
    
    // Check cache first
    if (lastSyncTimes[webinarId]) {
      return lastSyncTimes[webinarId];
    }
    
    // Fetch from database
    const lastSync = await getWebinarLastSyncTime(webinarId, user.id);
    setLastSyncTimes(prev => ({
      ...prev,
      [webinarId]: lastSync
    }));
    
    return lastSync;
  };

  return {
    syncWebinar,
    isSyncing: syncMutation.isPending,
    syncingWebinarId: syncMutation.variables,
    getLastSyncTime,
    lastSyncTimes
  };
}
