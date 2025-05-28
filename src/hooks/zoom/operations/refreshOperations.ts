
import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { refreshWebinarsFromAPI } from '../services/coreWebinarOperations';
import { updateParticipantDataOperation } from './participantOperations';
import { executeWithTimeout, OPERATION_TIMEOUT } from '../utils/timeoutUtils';

/**
 * COMPREHENSIVE MASTER SYNC OPERATION - Updates ALL database tables
 * This is the single point of sync for the entire application
 */
export async function refreshWebinarsOperation(
  userId: string | undefined,
  queryClient: QueryClient,
  force: boolean = false
): Promise<void> {
  if (!userId) {
    toast({
      title: 'Authentication Required',
      description: 'You must be logged in to sync data',
      variant: 'destructive'
    });
    return;
  }
  
  let isCompleted = false;
  let timeoutTriggered = false;
  let participantsUpdated = 0;
  
  try {
    console.log(`[MASTER SYNC] Starting comprehensive database sync with force=${force} for user ${userId}`);
    console.log(`[MASTER SYNC] This will update ALL tables: webinars, instances, participants, recordings, etc.`);
    
    // STEP 1: Main webinars and instances sync (this also syncs instances now)
    const refreshData = await executeWithTimeout(
      () => refreshWebinarsFromAPI(force),
      OPERATION_TIMEOUT,
      () => {
        timeoutTriggered = true;
        toast({
          title: 'Comprehensive sync taking longer than expected',
          description: 'The operation is still running in the background. All data will be updated.',
          variant: 'default'
        });
      }
    );
    
    // STEP 2: Participant data sync for all webinars
    console.log(`[MASTER SYNC] Syncing participant data for all webinars`);
    try {
      const participantData = await updateParticipantDataOperation(userId, queryClient, true);
      participantsUpdated = participantData?.updated || 0;
      console.log(`[MASTER SYNC] Participant data sync completed: ${participantsUpdated} webinars updated`);
    } catch (err) {
      console.error('[MASTER SYNC] Error updating participant data:', err);
      // Don't throw here, as we want the main sync to succeed even if participant data fails
    }

    isCompleted = true;

    // Invalidate ALL query caches to force refresh of all data
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinar-instances'] });
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinar-participants'] });
    
    // Show comprehensive sync notification
    if (refreshData.summary) {
      const { 
        totalCollected = 0, 
        uniqueWebinars = 0, 
        successfulUpserts = 0, 
        historicalWebinars = 0,
        upcomingWebinars = 0,
        instanceSync
      } = refreshData.summary;
      
      const instancesMessage = instanceSync ? ` and ${instanceSync.totalInstancesSynced} instances` : '';
      const participantMessage = participantsUpdated ? `, participant data for ${participantsUpdated} webinars` : '';
      
      toast({
        title: 'Complete database sync finished',
        description: `Updated ${successfulUpserts} webinars${instancesMessage}${participantMessage}. All tables refreshed.`,
        variant: 'default'
      });
    } else {
      // Basic fallback notification
      toast({
        title: 'Database sync completed',
        description: `All webinar data has been updated from Zoom${participantsUpdated ? ` (${participantsUpdated} webinars with participant data)` : ''}`,
        variant: 'default'
      });
    }
  } catch (err: any) {
    isCompleted = true;
    
    console.error('[MASTER SYNC] Error during comprehensive sync:', err);
    
    // Different error handling based on error type
    if (timeoutTriggered) {
      toast({
        title: 'Sync may be incomplete',
        description: 'The operation took too long. Some data may still be processing in the background.',
        variant: 'warning'
      });
    } else {
      // Enhanced error handling
      let errorMessage = 'An unexpected error occurred during database sync';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Handle specific error types
      if (errorMessage.includes('scopes')) {
        toast({
          title: 'Missing OAuth Scopes',
          description: 'Please check your Zoom app configuration and add the required scopes',
          variant: 'destructive'
        });
      } else if (errorMessage.includes('credentials')) {
        toast({
          title: 'Authentication Error',
          description: 'Please check your Zoom credentials',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Database sync failed',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    }
    
    throw err;
  } finally {
    console.log(`[MASTER SYNC] Comprehensive database sync completed: ${isCompleted}`);
  }
}
