
import { useCallback } from 'react';
import { ZoomCredentialsStatus } from '@/hooks/zoom';
import { useWebinarSync } from './useWebinarSync';

export function useWebinarActions(
  setShowWizard: (show: boolean) => void,
  checkCredentialsStatus: () => Promise<ZoomCredentialsStatus | null>,
  setActiveTab: (tab: string) => void,
  resetErrorBanner: () => void
) {
  const { executeSync } = useWebinarSync();

  const handleSetupZoom = useCallback(() => {
    console.log('[useWebinarActions] Opening Zoom setup wizard');
    setShowWizard(true);
    resetErrorBanner();
  }, [setShowWizard, resetErrorBanner]);

  const handleWizardComplete = useCallback(async () => {
    console.log('[useWebinarActions] Wizard complete, refreshing credentials and webinars');
    setShowWizard(false);
    
    try {
      await checkCredentialsStatus();
      await executeSync();
      setActiveTab("webinars");
      resetErrorBanner();
    } catch (error) {
      console.error('[useWebinarActions] Error after wizard completion:', error);
    }
  }, [setShowWizard, checkCredentialsStatus, executeSync, setActiveTab, resetErrorBanner]);

  const handleRefresh = useCallback(async (force: boolean = false) => {
    try {
      await executeSync(force);
    } catch (error) {
      console.error('[useWebinarActions] Refresh failed:', error);
      throw error;
    }
  }, [executeSync]);

  return {
    handleSetupZoom,
    handleWizardComplete,
    handleRefresh
  };
}
