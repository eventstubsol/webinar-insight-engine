
import React, { createContext, useContext } from 'react';

// Type definitions
export type ViewMode = 'list' | 'grid';
export type FilterTab = 'all' | 'live' | 'upcoming' | 'past' | 'drafts';

interface WebinarContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  filterTab: FilterTab;
  setFilterTab: (tab: FilterTab) => void;
}

// Create context with default values
export const WebinarContext = createContext<WebinarContextType>({
  viewMode: 'grid',
  setViewMode: () => {},
  filterTab: 'all',
  setFilterTab: () => {}
});

// Context provider component
export const WebinarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [filterTab, setFilterTab] = React.useState<FilterTab>('all');

  return (
    <WebinarContext.Provider value={{ viewMode, setViewMode, filterTab, setFilterTab }}>
      {children}
    </WebinarContext.Provider>
  );
};

// Hook for using the webinar context
export const useWebinarContext = () => useContext(WebinarContext);
