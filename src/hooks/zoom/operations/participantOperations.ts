
import { QueryClient } from '@tanstack/react-query';
import { updateParticipantDataAPI } from '../services/apiService';
import { executeWithTimeout, OPERATION_TIMEOUT } from './timeoutUtils';
import { 
  showParticipantUpdateNotification, 
  showErrorNotification 
} from '../utils/notificationUtils';
import { toast } from '@/hooks/use-toast';

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
            description: 'The participant data update may still be running in the background.',
            variant: 'default'
          });
        }
      }
    );
    
    // Only show toast if not silent mode
    if (!silent) {
      showParticipantUpdateNotification(data);
    }
    
    // Invalidate the query cache to force a refresh
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    
    return data;
  } catch (err) {
    console.error('[updateParticipantDataOperation] Unhandled error:', err);
    
    if (!silent) {
      showErrorNotification(err, 'Update failed');
    }
    
    throw err;
  }
}
