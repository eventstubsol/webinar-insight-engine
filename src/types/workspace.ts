
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type WorkspaceMemberRole = 'owner' | 'admin' | 'analyst' | 'viewer';

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRole;
  joined_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: Error | null;
  fetchWorkspaces: () => Promise<void>;
  selectWorkspace: (workspaceId: string) => void;
  createWorkspace: (data: { name: string; description?: string }) => Promise<Workspace>;
  updateWorkspace: (id: string, data: { name?: string; description?: string }) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  fetchWorkspaceMembers: (workspaceId: string) => Promise<WorkspaceMember[]>;
  inviteWorkspaceMember: (workspaceId: string, email: string, role: WorkspaceMemberRole) => Promise<void>;
  updateWorkspaceMember: (memberId: string, role: WorkspaceMember['role']) => Promise<void>;
  removeWorkspaceMember: (memberId: string) => Promise<void>;
  userRole: WorkspaceMember['role'] | null;
}
