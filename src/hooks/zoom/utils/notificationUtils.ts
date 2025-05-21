
import { toast } from '@/hooks/use-toast';
import { enhanceErrorMessage } from './errorUtils';

/**
 * Display successful sync notification
 */
export function showSyncSuccessNotification(syncResults: any): void {
  if (syncResults?.itemsUpdated > 0) {
    toast({
      title: 'Webinars synced',
      description: `Successfully updated ${syncResults.itemsUpdated} webinars from Zoom`,
      variant: 'success'
    });
  } else {
    toast({
      title: 'No changes found',
      description: 'No webinar changes detected in your Zoom account',
    });
  }
}

/**
 * Display error notification
 */
export function showErrorNotification(error: any, title: string = 'Error'): void {
  const errorMessage = enhanceErrorMessage(error);
  
  toast({
    title,
    description: errorMessage,
    variant: 'destructive'
  });
}

/**
 * Display participant data update notification
 */
export function showParticipantUpdateNotification(data: any): void {
  toast({
    title: 'Participant data updated',
    description: data.message || `Updated ${data.updated} webinars with participant data`,
    variant: 'success'
  });
}
