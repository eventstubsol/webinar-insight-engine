
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Workspace, WorkspaceMember, WorkspaceMemberRole } from '@/types/workspace';

/**
 * Fetches workspaces for the current user
 */
export async function fetchUserWorkspaces(userId: string) {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*, workspace_members!inner(user_id, role)')
    .eq('workspace_members.user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Error fetching workspaces: ${error.message}`);
  }

  // Transform data to extract just the workspace info
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

  return userWorkspaces;
}

/**
 * Fetches the user's role in a specific workspace
 */
export async function fetchUserRoleInWorkspace(workspaceId: string, userId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return data.role as WorkspaceMemberRole;
}

/**
 * Creates a new workspace
 */
export async function createNewWorkspace(
  userId: string,
  data: { name: string; description?: string }
) {
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
      created_by: userId,
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
      user_id: userId,
      role: 'owner',
    });

  if (memberError) {
    console.error('Error adding creator as owner:', memberError);
    // We don't throw here as the workspace was created successfully
  }

  toast({
    title: 'Workspace created',
    description: `${data.name} workspace has been created successfully.`,
  });

  return createdWorkspace;
}

/**
 * Updates an existing workspace
 */
export async function updateExistingWorkspace(
  id: string,
  data: { name?: string; description?: string }
) {
  const { error } = await supabase
    .from('workspaces')
    .update({
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`Failed to update workspace: ${error.message}`);
  
  toast({
    title: 'Workspace updated',
    description: 'Workspace details have been updated successfully.',
  });
}

/**
 * Deletes a workspace
 */
export async function deleteExistingWorkspace(id: string) {
  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete workspace: ${error.message}`);
  
  toast({
    title: 'Workspace deleted',
    description: 'The workspace has been deleted successfully.',
  });
}

/**
 * Fetches members of a workspace
 */
export async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
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

  // Transform to match our interface with proper null handling
  const members: WorkspaceMember[] = data.map(item => {
    // Fix: Properly handle the profiles data which could be null
    const profileData = item.profiles || null;
    
    return {
      id: item.id,
      workspace_id: item.workspace_id,
      user_id: item.user_id,
      role: item.role as WorkspaceMemberRole,
      joined_at: item.joined_at,
      profile: profileData ? {
        display_name: profileData.display_name || null,
        avatar_url: profileData.avatar_url || null
      } : undefined
    };
  });

  return members;
}

/**
 * Invites a user to join a workspace
 */
export async function inviteUserToWorkspace(
  workspaceId: string, 
  email: string, 
  role: WorkspaceMemberRole
) {
  // First, get the current user to check for the profiles table structure
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Look up user by auth.users.email instead of profiles.email
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id) // This should match the user's auth ID
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
      role: role as string, // Explicit casting to avoid type issues
    });

  if (addError) throw new Error(`Failed to add member: ${addError.message}`);
  
  toast({
    title: 'Member added',
    description: `User has been added to the workspace as ${role}.`,
  });
}

/**
 * Updates a workspace member's role
 */
export async function updateWorkspaceMemberRole(memberId: string, role: WorkspaceMemberRole) {
  const { error } = await supabase
    .from('workspace_members')
    .update({ role: role as string }) // Explicit casting to avoid type issues
    .eq('id', memberId);

  if (error) throw new Error(`Failed to update member role: ${error.message}`);
  
  toast({
    title: 'Member role updated',
    description: `Member's role has been updated to ${role}.`,
  });
}

/**
 * Removes a member from a workspace
 */
export async function removeWorkspaceMember(memberId: string) {
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('id', memberId);

  if (error) throw new Error(`Failed to remove member: ${error.message}`);
  
  toast({
    title: 'Member removed',
    description: 'Member has been removed from the workspace.',
  });
}
