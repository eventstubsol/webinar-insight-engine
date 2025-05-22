import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// These functions have been moved to dedicated service and utility files
// This file now just re-exports the functions from those files for backward compatibility

// Re-export functions from services
export { 
  fetchWebinarsFromDatabase,
  fetchWebinarsFromAPI
} from '../services/WebinarService';

export {
  fetchSyncHistory
} from '../services/SyncHistoryService';

// Re-export functions from error utilities
export { 
  enhanceErrorMessage
} from './errorUtils';

// Keep this function for backward compatibility
// though it's now implemented in the operations file
export async function updateParticipantDataForWebinars(userId: string | undefined): Promise<void> {
  if (!userId) {
    console.log('[updateParticipantDataForWebinars] No userId provided');
    toast({
      title: 'Authentication required',
      description: 'You must be logged in to update participant data',
      variant: 'destructive'
    });
    throw new Error('Authentication Required: You must be logged in to update participant data');
  }
  
  console.log(`[updateParticipantDataForWebinars] Updating participant data for user ${userId}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('zoom-api', {
      body: { 
        action: 'update-webinar-participants',
        user_id: userId // Pass userId to Edge Function
      }
    });
    
    if (error) {
      console.error('[updateParticipantDataForWebinars] Error:', error);
      throw error;
    }
    
    console.log('[updateParticipantDataForWebinars] Update completed:', data);
    
    // Show toast with results
    toast({
      title: 'Participant data updated',
      description: data.message || `Updated ${data.updated} webinars with participant data`,
      variant: 'success'
    });
  } catch (err: any) {
    console.error('[updateParticipantDataForWebinars] Unhandled error:', err);
    
    // Show error toast with enhanced message
    toast({
      title: 'Update failed',
      description: err.message || 'Failed to update participant data',
      variant: 'destructive'
    });
    
    throw err;
  }
}
