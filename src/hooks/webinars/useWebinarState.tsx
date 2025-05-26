
import { useState, useEffect } from 'react';

const ERROR_PERSIST_KEY = 'zoom-webinar-error-dismissed';
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function useWebinarState() {
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("webinars");
  const [showWizard, setShowWizard] = useState(false);
  const [errorBannerDismissed, setErrorBannerDismissed] = useState<boolean>(() => {
    const storedValue = localStorage.getItem(ERROR_PERSIST_KEY);
    return storedValue === 'true';
  });

  const dismissErrorBanner = () => {
    setErrorBannerDismissed(true);
    localStorage.setItem(ERROR_PERSIST_KEY, 'true');
    console.log('[useWebinarState] Error banner dismissed by user');
  };

  const resetErrorBanner = () => {
    setErrorBannerDismissed(false);
    localStorage.removeItem(ERROR_PERSIST_KEY);
  };

  return {
    isFirstLoad,
    setIsFirstLoad,
    activeTab,
    setActiveTab,
    showWizard,
    setShowWizard,
    errorBannerDismissed,
    dismissErrorBanner,
    resetErrorBanner,
    AUTO_REFRESH_INTERVAL
  };
}
