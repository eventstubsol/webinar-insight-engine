
import { useState, useEffect, useCallback } from 'react';
import { ViewMode, FilterTab } from './WebinarContext';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export function useWebinarUIState() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ 
    from: undefined, 
    to: undefined 
  });

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
    viewMode,
    setViewMode,
    filterTab,
    setFilterTab,
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange
  };
}
