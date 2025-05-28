
import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { refreshWebinarsFromAPI } from '../services/coreWebinarOperations';
import { updateParticipantDataOperation } from './participantOperations';
import { executeWithTimeout, OPERATION_TIMEOUT } from '../utils/timeoutUtils';

/**
 * Enhanced refresh webinars operation with historical data fetching
 */
export async function refreshWebinarsOperation(
  userId: string | undefined,
  queryClient: QueryClient,
  force: boolean = false
): Promise<void> {
  if (!userId) {
    toast({
      title: 'Authentication Required',
      description: 'You must be logged in to refresh webinars',
      variant: 'destructive'
    });
    return;
  }
  
  let isCompleted = false;
  let timeoutTriggered = false;
  let participantsUpdated = 0;
  
  try {
    console.log(`[refreshWebinarsOperation] Starting enhanced refresh with force=${force} for user ${userId}`);
    
    // Make the API call to fetch fresh data from Zoom with enhanced strategy
    const refreshData = await executeWithTimeout(
      () => refreshWebinarsFromAPI(userId, force),
      OPERATION_TIMEOUT,
      () => {
        timeoutTriggered = true;
        toast({
          title: 'Enhanced sync taking longer than expected',
          description: 'The operation is still running in the background. Historical data will be preserved.',
          variant: 'default'
        });
      }
    );
    
    isCompleted = true;

    // Also update participant data for completed webinars (silently)
    try {
      const participantData = await updateParticipantDataOperation(userId, queryClient, true);
      participantsUpdated = participantData?.updated || 0;
    } catch (err) {
      console.error('[refreshWebinarsOperation] Error updating participant data:', err);
      // Don't throw here, as we want the main sync to succeed even if participant data fails
    }

    // Invalidate the query cache to force a refresh
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    
    // Show enhanced notification with detailed sync results
    if (refreshData.summary) {
      const { 
        totalCollected = 0, 
        uniqueWebinars = 0, 
        successfulUpserts = 0, 
        historicalWebinars = 0,
        upcomingWebinars = 0,
        webinarsBySource 
      } = refreshData.summary;
      
      const sourceBreakdown = webinarsBySource ? 
        `Sources: ${webinarsBySource.regular || 0} upcoming, ${webinarsBySource.reporting || 0} historical, ${webinarsBySource.account || 0} account` :
        '';
      
      const syncMessage = `${successfulUpserts} webinars synced (${historicalWebinars} historical, ${upcomingWebinars} upcoming)`;
      const participantMessage = participantsUpdated ? ` and participant data for ${participantsUpdated} webinars` : '';
      
      toast({
        title: 'Enhanced sync completed',
        description: `${syncMessage}${participantMessage}. ${sourceBreakdown}`,
        variant: 'default'
      });
    } else if (refreshData.syncResults) {
      // Fallback for legacy sync results format
      const { 
        newWebinars = 0, 
        updatedWebinars = 0, 
        preservedWebinars = 0, 
        totalWebinars = 0,
        dataRange 
      } = refreshData.syncResults;
      
      const syncMessage = `${newWebinars} new, ${updatedWebinars} updated, ${preservedWebinars} preserved`;
      const totalMessage = `Total: ${totalWebinars} webinars${dataRange?.oldest ? ` (from ${new Date(dataRange.oldest).toLocaleDateString()})` : ''}`;
      const participantMessage = participantsUpdated ? ` and participant data for ${participantsUpdated} webinars` : '';
      
      toast({
        title: 'Enhanced sync completed',
        description: `${syncMessage}. ${totalMessage}${participantMessage}`,
        variant: 'default'
      });
    } else {
      // Basic fallback notification
      toast({
        title: 'Webinars synced',
        description: 'Enhanced webinar data has been updated from Zoom',
        variant: 'default'
      });
    }
  } catch (err: any) {
    isCompleted = true;
    
    console.error('[refreshWebinarsOperation] Error during enhanced refresh:', err);
    
    // Different error handling based on error type
    if (timeoutTriggered) {
      toast({
        title: 'Enhanced sync may be incomplete',
        description: 'The operation took too long. Historical data has been preserved.',
        variant: 'warning'
      });
    } else {
      // Enhanced error handling
      let errorMessage = 'An unexpected error occurred during enhanced sync';
      
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
          title: 'Enhanced sync failed',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    }
    
    throw err;
  } finally {
    // Ensure that even if there's an uncaught exception, we set isCompleted
    // This flag can be used by the calling code to reset UI states
    console.log(`[refreshWebinarsOperation] Enhanced operation completed: ${isCompleted}`);
  }
}
