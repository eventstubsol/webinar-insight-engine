
import React, { createContext, useContext, useState } from 'react';

// Type definitions
export type ViewMode = 'list' | 'grid';
export type FilterTab = 'all' | 'live' | 'upcoming' | 'past' | 'drafts';

// New interface to represent a selected instance
export interface SelectedInstance {
  instanceId: string | null;
  webinarId: string | null;
}

interface WebinarContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  filterTab: FilterTab;
  setFilterTab: (tab: FilterTab) => void;
  // New fields for instance selection
  selectedInstance: SelectedInstance;
  setSelectedInstance: (instance: SelectedInstance) => void;
  showAllInstances: boolean;
  setShowAllInstances: (show: boolean) => void;
}

// Create context with default values
export const WebinarContext = createContext<WebinarContextType>({
  viewMode: 'grid',
  setViewMode: () => {},
  filterTab: 'all',
  setFilterTab: () => {},
  selectedInstance: { instanceId: null, webinarId: null },
  setSelectedInstance: () => {},
  showAllInstances: false,
  setShowAllInstances: () => {}
});

// Context provider component
export const WebinarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [selectedInstance, setSelectedInstance] = useState<SelectedInstance>({
    instanceId: null,
    webinarId: null
  });
  const [showAllInstances, setShowAllInstances] = useState<boolean>(false);

  return (
    <WebinarContext.Provider 
      value={{ 
        viewMode, 
        setViewMode, 
        filterTab, 
        setFilterTab, 
        selectedInstance,
        setSelectedInstance,
        showAllInstances,
        setShowAllInstances
      }}
    >
      {children}
    </WebinarContext.Provider>
  );
};

// Hook for using the webinar context
export const useWebinarContext = () => useContext(WebinarContext);
