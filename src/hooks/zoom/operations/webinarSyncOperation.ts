
import { QueryClient } from '@tanstack/react-query';
import { zoomApiClient } from '../services/zoomApiClient';
import { operationManager } from '../utils/operationUtils';
import { enhanceErrorMessage, isCredentialsError, isScopesError, isServerError } from '../utils/errorHandling';

export class WebinarSyncOperation {
  constructor(
    private userId: string,
    private queryClient: QueryClient
  ) {}

  async execute(force: boolean = false): Promise<void> {
    if (!this.userId) {
      operationManager.showErrorToast(
        'Authentication Required',
        'You must be logged in to refresh webinars'
      );
      return;
    }

    console.log(`[WebinarSyncOperation] Starting sync with force=${force} for user ${this.userId}`);

    try {
      // Start progress feedback
      operationManager.startProgressFeedback((stage) => {
        operationManager.showProgressToast(stage);
      });

      // Execute the sync operation with timeout
      const refreshData = await operationManager.executeWithTimeout(
        () => zoomApiClient.listWebinars(force),
        undefined,
        () => operationManager.showProgressToast("Operation is taking longer than expected. Please wait...")
      );

      // Invalidate cache to trigger refresh
      await this.queryClient.invalidateQueries({ 
        queryKey: ['zoom-webinars', this.userId] 
      });

      // Show success message
      this.handleSyncSuccess(refreshData);

    } catch (error: any) {
      console.error('[WebinarSyncOperation] Error during sync:', error);
      this.handleSyncError(error);
      throw error;
    }
  }

  private handleSyncSuccess(refreshData: any) {
    if (refreshData?.syncResults) {
      const { 
        newWebinars = 0, 
        updatedWebinars = 0, 
        preservedWebinars = 0, 
        totalWebinars = 0,
        dataRange 
      } = refreshData.syncResults;
      
      const syncMessage = `${newWebinars} new, ${updatedWebinars} updated, ${preservedWebinars} preserved`;
      const totalMessage = `Total: ${totalWebinars} webinars${dataRange?.oldest ? ` (from ${new Date(dataRange.oldest).toLocaleDateString()})` : ''}`;
      
      operationManager.showSuccessToast(
        'Sync completed successfully',
        `${syncMessage}. ${totalMessage}`
      );
    } else {
      operationManager.showSuccessToast(
        'Webinars synced',
        'Webinar data has been updated from Zoom'
      );
    }
  }

  private handleSyncError(error: any) {
    const errorMessage = enhanceErrorMessage(error);
    
    if (error?.message?.includes('timed out')) {
      operationManager.showErrorToast(
        'Sync may be incomplete',
        'The operation took longer than expected. Some data may still be processing. Please try again in a few minutes.',
        'warning'
      );
    } else if (isScopesError(errorMessage)) {
      operationManager.showErrorToast(
        'Missing OAuth Scopes',
        'Please check your Zoom app configuration and add the required scopes'
      );
    } else if (isCredentialsError(errorMessage)) {
      operationManager.showErrorToast(
        'Authentication Error',
        'Please check your Zoom credentials'
      );
    } else if (isServerError(errorMessage)) {
      operationManager.showErrorToast(
        'Server Error',
        'The sync operation encountered a server error. This may be due to processing a large amount of data. Please try again in a few minutes.'
      );
    } else {
      operationManager.showErrorToast(
        'Sync failed',
        errorMessage
      );
    }
  }
}
