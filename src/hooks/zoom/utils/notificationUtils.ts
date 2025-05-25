
import { toast } from '@/hooks/use-toast';

/**
 * Show sync success notification with enhanced details
 */
export function showSyncSuccessNotification(data: any) {
  const syncResults = data?.syncResults;
  
  if (syncResults?.preservedHistoricalData) {
    // Enhanced notification for non-destructive sync
    const message = `${syncResults.newWebinars || 0} new, ${syncResults.updatedWebinars || 0} updated, ${syncResults.preservedWebinars || 0} preserved`;
    const description = `Total: ${syncResults.totalWebinars || 0} webinars${syncResults.dataRange?.oldest ? ` (from ${new Date(syncResults.dataRange.oldest).toLocaleDateString()})` : ''}`;
    
    toast({
      title: 'Sync completed successfully',
      description: `${message}. ${description}`,
      variant: 'default'
    });
  } else if (syncResults?.itemsUpdated > 0) {
    // Regular sync notification
    toast({
      title: 'Sync completed successfully',
      description: `Updated ${syncResults.itemsUpdated} webinars from Zoom`,
      variant: 'default'
    });
  } else {
    // Fallback notification
    toast({
      title: 'Webinars synced',
      description: 'Webinar data has been updated from Zoom',
      variant: 'default'
    });
  }
}

/**
 * Show participant update notification
 */
export function showParticipantUpdateNotification(data: any) {
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

/**
 * Show error notification with context
 */
export function showErrorNotification(error: any, context: string = 'Operation failed') {
  let errorMessage = 'An unexpected error occurred';
  
  if (error?.message) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
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
      title: context,
      description: errorMessage,
      variant: 'destructive'
    });
  }
}
