
import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface ComprehensiveSyncOptions {
  includeParticipants: boolean;
  includeInstances: boolean;
  includeChat: boolean;
  includePolls: boolean;
  includeQuestions: boolean;
  includeRecordings: boolean;
  includeEngagement: boolean;
  batchSize: number;
}

/**
 * Comprehensive sync operation that fetches all available Zoom data
 */
export async function comprehensiveSyncOperation(
  userId: string | undefined,
  queryClient: QueryClient,
  options: ComprehensiveSyncOptions
): Promise<any> {
  if (!userId) {
    toast({
      title: 'Authentication Required',
      description: 'You must be logged in to perform comprehensive sync',
      variant: 'destructive'
    });
    return;
  }

  console.log(`[comprehensiveSyncOperation] Starting comprehensive sync for user ${userId}`);
  console.log(`[comprehensiveSyncOperation] Options:`, options);

  try {
    const { data, error } = await supabase.functions.invoke('zoom-api', {
      body: {
        action: 'comprehensive-sync',
        options
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to perform comprehensive sync');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    // Invalidate all relevant queries to refresh the UI
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] }),
      queryClient.invalidateQueries({ queryKey: ['zoom-participants'] }),
      queryClient.invalidateQueries({ queryKey: ['zoom-instances'] }),
      queryClient.invalidateQueries({ queryKey: ['zoom-chat'] }),
      queryClient.invalidateQueries({ queryKey: ['zoom-polls'] }),
      queryClient.invalidateQueries({ queryKey: ['zoom-questions'] }),
      queryClient.invalidateQueries({ queryKey: ['zoom-recordings'] })
    ]);

    console.log(`[comprehensiveSyncOperation] Comprehensive sync completed successfully`);
    
    return data;

  } catch (err: any) {
    console.error('[comprehensiveSyncOperation] Error during comprehensive sync:', err);
    
    toast({
      title: 'Comprehensive Sync Failed',
      description: err.message || 'An unexpected error occurred during comprehensive sync',
      variant: 'destructive'
    });
    
    throw err;
  }
}

/**
 * Get comprehensive sync status and progress
 */
export async function getComprehensiveSyncStatus(userId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('zoom_sync_history')
      .select('*')
      .eq('user_id', userId)
      .eq('sync_type', 'comprehensive')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error is OK
      throw error;
    }

    return data;
  } catch (err) {
    console.error('[getComprehensiveSyncStatus] Error:', err);
    return null;
  }
}
