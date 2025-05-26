
import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { refreshWebinarsFromAPI } from '../services/webinarApiService';
import { updateParticipantDataOperation } from './participantOperations';
import { executeWithTimeout, OPERATION_TIMEOUT } from '../utils/timeoutUtils';

/**
 * OPTIMIZED refresh webinars operation with batch processing and improved error recovery
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
  let enhancementFailed = false;
  
  try {
    console.log(`[refreshWebinarsOperation] Starting OPTIMIZED batch-processed refresh with force=${force} for user ${userId}`);
    
    // OPTIMIZED timeout handling with better user feedback
    const OPTIMIZED_TIMEOUT = 50000; // 50 seconds - within the new 60s edge function timeout
    
    // Make the API call to fetch fresh data from Zoom with OPTIMIZED timeout protection
    const refreshData = await executeWithTimeout(
      () => refreshWebinarsFromAPI(userId, force),
      OPTIMIZED_TIMEOUT,
      () => {
        timeoutTriggered = true;
        console.log('[refreshWebinarsOperation] Timeout triggered, showing user notification');
        toast({
          title: 'Sync in progress',
          description: 'Large dataset detected. The sync is continuing with batch processing. Historical data is preserved.',
          variant: 'default'
        });
      }
    );
    
    isCompleted = true;

    // Participant data update with error isolation (reduced timeout for optimization)
    try {
      console.log('[refreshWebinarsOperation] Starting participant data update (isolated)');
      const participantData = await updateParticipantDataOperation(userId, queryClient, true);
      participantsUpdated = participantData?.updated || 0;
      console.log(`[refreshWebinarsOperation] ✅ Participant data updated for ${participantsUpdated} webinars`);
    } catch (err) {
      console.error('[refreshWebinarsOperation] Error updating participant data (isolated):', err);
      // Don't throw here, as we want the main sync to succeed even if participant data fails
    }

    // Invalidate the query cache to force a refresh
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    
    // OPTIMIZED notification with detailed sync results and batch processing information
    if (refreshData.syncResults) {
      const { 
        newWebinars = 0, 
        updatedWebinars = 0, 
        preservedWebinars = 0, 
        totalWebinars = 0,
        dataRange,
        actualTimingCount = 0,
        enhancementStats
      } = refreshData.syncResults;
      
      const syncMessage = `${newWebinars} new, ${updatedWebinars} updated, ${preservedWebinars} preserved`;
      const totalMessage = `Total: ${totalWebinars} webinars${dataRange?.oldest ? ` (from ${new Date(dataRange.oldest).toLocaleDateString()})` : ''}`;
      const participantMessage = participantsUpdated ? ` and participant data for ${participantsUpdated} webinars` : '';
      
      // CRITICAL: Include actual timing data information in the success message
      const timingMessage = actualTimingCount > 0 ? ` 🎯 ${actualTimingCount} webinars with actual timing data.` : '';
      
      // Check if enhancement had issues
      if (enhancementStats?.errors && enhancementStats.errors.length > 0) {
        enhancementFailed = true;
        console.warn('[refreshWebinarsOperation] Enhancement had errors:', enhancementStats.errors);
      }
      
      const finalMessage = `${syncMessage}. ${totalMessage}${participantMessage}.${timingMessage}`;
      
      toast({
        title: enhancementFailed ? 'Sync completed with some limitations' : 'Batch-processed sync completed',
        description: finalMessage,
        variant: enhancementFailed ? 'default' : 'default'
      });
      
      // Log comprehensive results for debugging
      console.log(`[refreshWebinarsOperation] ✅ OPTIMIZED sync completed: ${finalMessage}`);
      if (actualTimingCount > 0) {
        console.log(`[refreshWebinarsOperation] 🎯 CRITICAL SUCCESS: ${actualTimingCount} webinars have actual timing data`);
      }
      
    } else {
      // Fallback for backward compatibility
      toast({
        title: 'Webinars synced',
        description: 'Webinar data has been updated from Zoom using batch processing',
        variant: 'default'
      });
    }
  } catch (err: any) {
    isCompleted = true;
    
    console.error('[refreshWebinarsOperation] Error during OPTIMIZED refresh:', err);
    
    // OPTIMIZED error handling based on error type with better categorization
    if (timeoutTriggered) {
      toast({
        title: 'Sync may be incomplete',
        description: 'The operation took longer than expected. Batch processing is optimizing the sync. Try again in a moment.',
        variant: 'default'
      });
    } else {
      // Enhanced error handling with specific error type detection
      let errorMessage = 'An unexpected error occurred';
      let errorTitle = 'Sync failed';
      
      if (err?.message) {
        errorMessage = err.message;
        
        // Categorize specific error types for better user experience
        if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
          errorTitle = 'Sync timeout';
          errorMessage = 'The sync operation timed out. The system has been optimized for batch processing. Please try again.';
        } else if (errorMessage.includes('scopes') || errorMessage.includes('Scopes')) {
          errorTitle = 'Missing OAuth Scopes';
          errorMessage = 'Please check your Zoom app configuration and add the required scopes';
        } else if (errorMessage.includes('credentials') || errorMessage.includes('Authentication')) {
          errorTitle = 'Authentication Error';
          errorMessage = 'Please check your Zoom credentials';
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          errorTitle = 'Rate limit exceeded';
          errorMessage = 'Too many requests. The batch processing system will help. Please wait a moment and try again.';
        } else if (errorMessage.includes('Enhancement')) {
          errorTitle = 'Sync completed with limitations';
          errorMessage = 'Basic data was synced with batch processing, but some enhancements failed. Data is preserved.';
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive'
      });
    }
    
    throw err;
  } finally {
    // Enhanced final logging with operation summary
    console.log(`[refreshWebinarsOperation] OPTIMIZED operation completed: ${isCompleted}, timeout: ${timeoutTriggered}, participants: ${participantsUpdated}, enhancement issues: ${enhancementFailed}`);
  }
}
