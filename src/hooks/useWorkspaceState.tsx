
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { 
  fetchUserWorkspaces, 
  fetchUserRoleInWorkspace,
  createNewWorkspace,
  updateExistingWorkspace,
  deleteExistingWorkspace,
  fetchWorkspaceMembers,
  inviteUserToWorkspace,
  updateWorkspaceMemberRole,
  removeWorkspaceMember
} from '@/api/workspaceApi';
import { Workspace, WorkspaceMember, WorkspaceMemberRole } from '@/types/workspace';

export function useWorkspaceState() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userRole, setUserRole] = useState<WorkspaceMemberRole | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const userWorkspaces = await fetchUserWorkspaces(user.id);
      setWorkspaces(userWorkspaces);

      // If we have workspaces but no current workspace is selected
      // or the current workspace is no longer valid, select the first workspace
      if (userWorkspaces.length > 0) {
        const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
        const workspaceExists = savedWorkspaceId && userWorkspaces.some(w => w.id === savedWorkspaceId);
        
        if (!currentWorkspace || !workspaceExists) {
          const firstWorkspace = userWorkspaces[0];
          setCurrentWorkspace(firstWorkspace);
          localStorage.setItem('currentWorkspaceId', firstWorkspace.id);
          
          // Get user role in this workspace
          const role = await fetchUserRoleInWorkspace(firstWorkspace.id, user.id);
          setUserRole(role);
        } else if (savedWorkspaceId) {
          const selectedWorkspace = userWorkspaces.find(w => w.id === savedWorkspaceId);
          if (selectedWorkspace) {
            setCurrentWorkspace(selectedWorkspace);
            // Get user role in this workspace
            const role = await fetchUserRoleInWorkspace(selectedWorkspace.id, user.id);
            setUserRole(role);
          }
        }
      } else {
        setCurrentWorkspace(null);
        setUserRole(null);
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err);
      setError(err as Error);
      toast({
        title: 'Failed to load workspaces',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentWorkspace]);

  const selectWorkspace = useCallback(async (workspaceId: string) => {
    if (!user) return;
    
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      localStorage.setItem('currentWorkspaceId', workspaceId);
      
      const role = await fetchUserRoleInWorkspace(workspaceId, user.id);
      setUserRole(role);
    }
  }, [workspaces, user]);

  const createWorkspace = useCallback(async (data: { name: string; description?: string }): Promise<Workspace> => {
    if (!user) throw new Error('User must be logged in');

    try {
      const newWorkspace = await createNewWorkspace(user.id, data);
      
      // Refetch workspaces to update the list
      await fetchWorkspaces();
      
      return newWorkspace;
    } catch (err) {
      console.error('Error creating workspace:', err);
      toast({
        title: 'Failed to create workspace',
        description: (err as Error).message,
        variant: 'destructive',
      });
      throw err;
    }
  }, [user, fetchWorkspaces]);

  const updateWorkspace = useCallback(async (id: string, data: { name?: string; description?: string }) => {
    try {
      await updateExistingWorkspace(id, data);
      
      // Refetch workspaces to update the list
      await fetchWorkspaces();
    } catch (err) {
      console.error('Error updating workspace:', err);
      toast({
        title: 'Failed to update workspace',
        description: (err as Error).message,
        variant: 'destructive',
      });
      throw err;
    }
  }, [fetchWorkspaces]);

  const deleteWorkspace = useCallback(async (id: string) => {
    try {
      await deleteExistingWorkspace(id);
      
      // If the deleted workspace was the current one, we need to select another
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(null);
        localStorage.removeItem('currentWorkspaceId');
      }

      // Refetch workspaces to update the list
      await fetchWorkspaces();
    } catch (err) {
      console.error('Error deleting workspace:', err);
      toast({
        title: 'Failed to delete workspace',
        description: (err as Error).message,
        variant: 'destructive',
      });
      throw err;
    }
  }, [currentWorkspace, fetchWorkspaces]);

  const inviteWorkspaceMember = useCallback(async (
    workspaceId: string, 
    email: string, 
    role: WorkspaceMemberRole
  ) => {
    try {
      await inviteUserToWorkspace(workspaceId, email, role);
    } catch (err) {
      console.error('Error inviting workspace member:', err);
      toast({
        title: 'Failed to add member',
        description: (err as Error).message,
        variant: 'destructive',
      });
      throw err;
    }
  }, []);

  const updateWorkspaceMember = useCallback(async (memberId: string, role: WorkspaceMember['role']) => {
    try {
      await updateWorkspaceMemberRole(memberId, role);
    } catch (err) {
      console.error('Error updating workspace member:', err);
      toast({
        title: 'Failed to update member',
        description: (err as Error).message,
        variant: 'destructive',
      });
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return {
    workspaces,
    currentWorkspace,
    isLoading,
    error,
    userRole,
    fetchWorkspaces,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    fetchWorkspaceMembers,
    inviteWorkspaceMember,
    updateWorkspaceMember,
    removeWorkspaceMember,
  };
}
