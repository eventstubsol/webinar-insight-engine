
import { useCallback } from 'react';

export function useWebinarSetupActions(
  setShowWizard: (show: boolean) => void,
  checkCredentialsStatus: () => Promise<void>,
  refreshWebinars: (force?: boolean) => Promise<void>,
  setActiveTab: (tab: string) => void,
  setErrorBannerDismissed: (dismissed: boolean) => void
) {
  // Handle setup wizard opening
  const handleSetupZoom = useCallback(() => {
    console.log('[useWebinarSetupActions] Opening Zoom setup wizard');
    setShowWizard(true);
    // Reset error dismissal when user explicitly chooses to configure
    setErrorBannerDismissed(false);
    localStorage.removeItem('zoom-webinar-error-dismissed');
  }, [setShowWizard, setErrorBannerDismissed]);
  
  // Handle wizard completion
  const handleWizardComplete = useCallback(async () => {
    console.log('[useWebinarSetupActions] Wizard complete, refreshing credentials and webinars');
    setShowWizard(false);
    
    // Re-check credentials status
    await checkCredentialsStatus();
    
    // Refresh webinars
    await refreshWebinars();
    
    // Switch to webinars tab
    setActiveTab("webinars");
    
    // Reset error dismissal
    setErrorBannerDismissed(false);
    localStorage.removeItem('zoom-webinar-error-dismissed');
  }, [setShowWizard, checkCredentialsStatus, refreshWebinars, setActiveTab, setErrorBannerDismissed]);

  return {
    handleSetupZoom,
    handleWizardComplete
  };
}
