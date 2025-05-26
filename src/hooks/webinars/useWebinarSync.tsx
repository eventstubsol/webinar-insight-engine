
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { WebinarSyncOperation } from '@/hooks/zoom/operations/webinarSyncOperation';

export function useWebinarSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  const executeSync = useCallback(async (force: boolean = false) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const syncOperation = new WebinarSyncOperation(user.id, queryClient);
      await syncOperation.execute(force);
    } catch (error) {
      console.error('[useWebinarSync] Sync failed:', error);
      setSyncError(error as Error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, queryClient]);

  return {
    executeSync,
    isSyncing,
    syncError
  };
}
