
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

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

interface WorkspaceContextType {
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
  inviteWorkspaceMember: (workspaceId: string, email: string, role: WorkspaceMember['role']) => Promise<void>;
  updateWorkspaceMember: (memberId: string, role: WorkspaceMember['role']) => Promise<void>;
  removeWorkspaceMember: (memberId: string) => Promise<void>;
  userRole: WorkspaceMember['role'] | null;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userRole, setUserRole] = useState<WorkspaceMember['role'] | null>(null);

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

      // Get workspaces where the user is a member
      const { data, error: workspacesError } = await supabase
        .from('workspaces')
        .select('*, workspace_members!inner(user_id, role)')
        .eq('workspace_members.user_id', user.id)
        .order('created_at', { ascending: false });

      if (workspacesError) {
        throw new Error(`Error fetching workspaces: ${workspacesError.message}`);
      }

      // Transform data to extract just the workspace info and ensure correct typing
      const userWorkspaces: Workspace[] = data.map(item => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        settings: item.settings as Record<string, any>,
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_by: item.created_by
      }));

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
          await fetchUserRole(firstWorkspace.id);
        } else if (savedWorkspaceId) {
          const selectedWorkspace = userWorkspaces.find(w => w.id === savedWorkspaceId);
          if (selectedWorkspace) {
            setCurrentWorkspace(selectedWorkspace);
            // Get user role in this workspace
            await fetchUserRole(selectedWorkspace.id);
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

  const fetchUserRole = async (workspaceId: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      const role = data.role as WorkspaceMemberRole;
      setUserRole(role);
      return role;
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      return null;
    }
  };

  const selectWorkspace = useCallback(async (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      localStorage.setItem('currentWorkspaceId', workspaceId);
      await fetchUserRole(workspaceId);
    }
  }, [workspaces]);

  const createWorkspace = useCallback(async (data: { name: string; description?: string }): Promise<Workspace> => {
    if (!user) throw new Error('User must be logged in');

    try {
      // Generate a URL-friendly slug from the name
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      // Add unique suffix to avoid conflicts
      const uniqueSuffix = Math.random().toString(36).substring(2, 10);
      const uniqueSlug = `${slug}-${uniqueSuffix}`;

      const { data: newWorkspace, error } = await supabase
        .from('workspaces')
        .insert({
          name: data.name,
          slug: uniqueSlug,
          description: data.description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create workspace: ${error.message}`);

      // Transform data to ensure correct typing
      const createdWorkspace: Workspace = {
        id: newWorkspace.id,
        name: newWorkspace.name,
        slug: newWorkspace.slug,
        description: newWorkspace.description,
        settings: newWorkspace.settings as Record<string, any>,
        created_at: newWorkspace.created_at,
        updated_at: newWorkspace.updated_at,
        created_by: newWorkspace.created_by
      };

      // Automatically add the creator as an owner
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: createdWorkspace.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) {
        console.error('Error adding creator as owner:', memberError);
        // We don't throw here as the workspace was created successfully
      }

      // Refetch workspaces to update the list
      await fetchWorkspaces();
      
      toast({
        title: 'Workspace created',
        description: `${data.name} workspace has been created successfully.`,
      });

      return createdWorkspace;
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
      const { error } = await supabase
        .from('workspaces')
        .update({
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new Error(`Failed to update workspace: ${error.message}`);

      // Refetch workspaces to update the list
      await fetchWorkspaces();
      
      toast({
        title: 'Workspace updated',
        description: 'Workspace details have been updated successfully.',
      });
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
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', id);

      if (error) throw new Error(`Failed to delete workspace: ${error.message}`);

      // If the deleted workspace was the current one, we need to select another
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(null);
        localStorage.removeItem('currentWorkspaceId');
      }

      // Refetch workspaces to update the list
      await fetchWorkspaces();
      
      toast({
        title: 'Workspace deleted',
        description: 'The workspace has been deleted successfully.',
      });
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

  const fetchWorkspaceMembers = useCallback(async (workspaceId: string): Promise<WorkspaceMember[]> => {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          id,
          workspace_id,
          user_id,
          role,
          joined_at,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('workspace_id', workspaceId);

      if (error) throw new Error(`Failed to fetch workspace members: ${error.message}`);

      // Transform to match our interface with proper typing
      const members: WorkspaceMember[] = data.map(item => ({
        id: item.id,
        workspace_id: item.workspace_id,
        user_id: item.user_id,
        role: item.role as WorkspaceMemberRole,
        joined_at: item.joined_at,
        profile: item.profiles ? {
          display_name: item.profiles.display_name || null,
          avatar_url: item.profiles.avatar_url || null
        } : undefined
      }));

      return members;
    } catch (err) {
      console.error('Error fetching workspace members:', err);
      toast({
        title: 'Failed to fetch members',
        description: (err as Error).message,
        variant: 'destructive',
      });
      throw err;
    }
  }, []);

  const inviteWorkspaceMember = useCallback(async (workspaceId: string, email: string, role: WorkspaceMemberRole) => {
    try {
      // First, check if the user exists
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (userError) throw new Error(`Failed to check user: ${userError.message}`);
      
      if (!userData) {
        // TODO: Implement email invitation flow for users who don't yet exist
        throw new Error('User not found. Invitation by email is not yet supported.');
      }

      // Check if user is already a member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userData.id)
        .maybeSingle();

      if (memberCheckError) throw new Error(`Failed to check existing membership: ${memberCheckError.message}`);
      
      if (existingMember) {
        throw new Error('User is already a member of this workspace.');
      }

      // Add the user as a member
      const { error: addError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userData.id,
          role,
        });

      if (addError) throw new Error(`Failed to add member: ${addError.message}`);
      
      toast({
        title: 'Member added',
        description: `User has been added to the workspace as ${role}.`,
      });
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

  const updateWorkspaceMember = useCallback(async (memberId: string, role: WorkspaceMemberRole) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw new Error(`Failed to update member role: ${error.message}`);
      
      toast({
        title: 'Member role updated',
        description: `Member's role has been updated to ${role}.`,
      });
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

  const removeWorkspaceMember = useCallback(async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw new Error(`Failed to remove member: ${error.message}`);
      
      toast({
        title: 'Member removed',
        description: 'Member has been removed from the workspace.',
      });
    } catch (err) {
      console.error('Error removing workspace member:', err);
      toast({
        title: 'Failed to remove member',
        description: (err as Error).message,
        variant: 'destructive',
      });
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const contextValue: WorkspaceContextType = {
    workspaces,
    currentWorkspace,
    isLoading,
    error,
    fetchWorkspaces,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    fetchWorkspaceMembers,
    inviteWorkspaceMember,
    updateWorkspaceMember,
    removeWorkspaceMember,
    userRole,
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
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
