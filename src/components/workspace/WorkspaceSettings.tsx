
import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

import { WorkspaceInfoCard } from './WorkspaceInfoCard';
import { MembersCard } from './MembersCard';
import { EditWorkspaceDialog } from './dialogs/EditWorkspaceDialog';
import { DeleteWorkspaceDialog } from './dialogs/DeleteWorkspaceDialog';
import { InviteMemberDialog } from './dialogs/InviteMemberDialog';

export function WorkspaceSettings() {
  const { 
    currentWorkspace,
    updateWorkspace,
    deleteWorkspace,
    fetchWorkspaceMembers,
    inviteWorkspaceMember,
    updateWorkspaceMember,
    removeWorkspaceMember,
    userRole
  } = useWorkspace();
  
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  
  const isOwner = userRole === 'owner';
  const isAdmin = isOwner || userRole === 'admin';

  useEffect(() => {
    if (currentWorkspace) {
      loadMembers();
    }
  }, [currentWorkspace]);

  const loadMembers = async () => {
    if (!currentWorkspace) return;
    
    setIsLoading(true);
    try {
      const fetchedMembers = await fetchWorkspaceMembers(currentWorkspace.id);
      setMembers(fetchedMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentWorkspace) return;
    
    try {
      await deleteWorkspace(currentWorkspace.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting workspace:', error);
    }
  };

  const handleUpdateRole = async (memberId, role) => {
    await updateWorkspaceMember(memberId, role);
    loadMembers();
  };

  const handleRemoveMember = async (memberId) => {
    await removeWorkspaceMember(memberId);
    loadMembers();
  };

  if (!currentWorkspace) {
    return <div>Please select a workspace</div>;
  }

  return (
    <div className="space-y-8">
      {/* Workspace Info Card */}
      <WorkspaceInfoCard
        workspace={currentWorkspace}
        userRole={userRole}
        onEditClick={() => setIsEditDialogOpen(true)}
        onDeleteClick={() => setIsDeleteDialogOpen(true)}
      />

      {/* Members Card */}
      <MembersCard
        members={members}
        isLoading={isLoading}
        isAdmin={isAdmin}
        currentUserRole={userRole}
        onInviteClick={() => setIsInviteDialogOpen(true)}
        onUpdateRole={handleUpdateRole}
        onRemoveMember={handleRemoveMember}
      />

      {/* Dialogs */}
      <EditWorkspaceDialog
        workspace={currentWorkspace}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={async (data) => {
          await updateWorkspace(currentWorkspace.id, data);
          setIsEditDialogOpen(false);
        }}
      />

      <DeleteWorkspaceDialog
        workspaceName={currentWorkspace.name}
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDelete={handleDelete}
      />

      <InviteMemberDialog
        isOpen={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onInvite={async (email, role) => {
          if (!currentWorkspace) return;
          
          await inviteWorkspaceMember(currentWorkspace.id, email, role);
          loadMembers();
          setIsInviteDialogOpen(false);
        }}
      />
    </div>
  );
}
