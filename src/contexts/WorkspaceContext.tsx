
import React, { createContext, useContext } from 'react';
import { useWorkspaceState } from '@/hooks/useWorkspaceState';
import { WorkspaceContextType } from '@/types/workspace';

export type { Workspace, WorkspaceMember, WorkspaceMemberRole } from '@/types/workspace';

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const workspaceState = useWorkspaceState();
  
  return (
    <WorkspaceContext.Provider value={workspaceState}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
