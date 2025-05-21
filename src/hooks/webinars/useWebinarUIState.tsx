
import { useState, useEffect, useCallback } from 'react';
import { ViewMode, FilterTab } from './WebinarContext';

const ERROR_PERSIST_KEY = 'zoom-webinar-error-dismissed';

export function useWebinarUIState() {
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("webinars");
  const [showWizard, setShowWizard] = useState(false);
  
  // Grid view is default
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  
  // Track if user has dismissed the error banner
  const [errorBannerDismissed, setErrorBannerDismissed] = useState(
    localStorage.getItem(ERROR_PERSIST_KEY) === 'true'
  );
  
  // Dismiss error banner and remember the choice
  const dismissErrorBanner = useCallback(() => {
    setErrorBannerDismissed(true);
    localStorage.setItem(ERROR_PERSIST_KEY, 'true');
    
    console.log('[useWebinarUIState] Error banner dismissed by user');
  }, []);

  // Setup event listeners for components communication
  useEffect(() => {
    const handleViewModeChange = (e: CustomEvent) => {
      setViewMode(e.detail as ViewMode);
    };
    
    const handleFilterTabChange = (e: CustomEvent) => {
      setFilterTab(e.detail as FilterTab);
    };
    
    window.addEventListener('viewModeChange', handleViewModeChange as EventListener);
    window.addEventListener('filterTabChange', handleFilterTabChange as EventListener);
    
    return () => {
      window.removeEventListener('viewModeChange', handleViewModeChange as EventListener);
      window.removeEventListener('filterTabChange', handleFilterTabChange as EventListener);
    };
  }, []);
  
  return {
    isFirstLoad,
    setIsFirstLoad,
    activeTab, 
    setActiveTab,
    showWizard,
    setShowWizard,
    viewMode,
    setViewMode,
    filterTab,
    setFilterTab,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    errorBannerDismissed,
    dismissErrorBanner
  };
}
