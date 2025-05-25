
import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { updateParticipantDataAPI } from '../services/webinarApiService';
import { executeWithTimeout, OPERATION_TIMEOUT } from '../utils/timeoutUtils';

/**
 * Update participant data operation with improved error handling
 * @param silent When true, don't show success notifications
 */
export async function updateParticipantDataOperation(
  userId: string | undefined,
  queryClient: QueryClient,
  silent: boolean = false
): Promise<any> {
  if (!userId) {
    if (!silent) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to update participant data',
        variant: 'destructive'
      });
    }
    return null;
  }
  
  try {
    const data = await executeWithTimeout(
      () => updateParticipantDataAPI(),
      OPERATION_TIMEOUT,
      () => {
        if (!silent) {
          toast({
            title: 'Update taking longer than expected',
            description: 'The participant data update is still running in the background.',
            variant: 'default'
          });
        }
      }
    );
    
    // Only show toast if not silent mode
    if (!silent) {
      const updated = data?.updated || 0;
      
      if (updated > 0) {
        toast({
          title: 'Participant data updated',
          description: `Updated participant data for ${updated} webinars`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Participant data checked',
          description: 'No updates needed for participant data',
          variant: 'default'
        });
      }
    }
    
    // Invalidate the query cache to force a refresh
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    
    return data;
  } catch (err) {
    console.error('[updateParticipantDataOperation] Unhandled error:', err);
    
    if (!silent) {
      let errorMessage = 'An unexpected error occurred';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      toast({
        title: 'Update failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
    
    throw err;
  }
}
