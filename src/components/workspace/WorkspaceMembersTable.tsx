
import React, { useState } from 'react';
import { WorkspaceMember, WorkspaceMemberRole } from '@/types/workspace';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WorkspaceMembersTableProps {
  members: WorkspaceMember[];
  isLoading: boolean;
  isAdmin: boolean;
  currentUserRole: WorkspaceMemberRole | null;
  onUpdateRole: (memberId: string, role: WorkspaceMemberRole) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
}

export function WorkspaceMembersTable({
  members,
  isLoading,
  isAdmin,
  currentUserRole,
  onUpdateRole,
  onRemoveMember,
}: WorkspaceMembersTableProps) {
  const RoleTag = ({ role }: { role: WorkspaceMemberRole }) => {
    const variants: Record<WorkspaceMemberRole, string> = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      analyst: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <Badge variant="outline" className={variants[role]}>
        {role}
      </Badge>
    );
  };

  return (
    <Table>
      <TableCaption>
        {isLoading ? 'Loading members...' : 'List of all members in this workspace'}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Role</TableHead>
          {isAdmin && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="flex items-center gap-2">
              <UserAvatar 
                name={member.profile?.display_name || 'User'} 
                avatarUrl={member.profile?.avatar_url || undefined} 
              />
              <span>{member.profile?.display_name || 'User'}</span>
            </TableCell>
            <TableCell>
              <RoleTag role={member.role as WorkspaceMemberRole} />
            </TableCell>
            {isAdmin && (
              <TableCell className="flex gap-2">
                <MemberActions
                  member={member}
                  onUpdateRole={(role) => onUpdateRole(member.id, role)}
                  onRemove={() => onRemoveMember(member.id)}
                  currentUserRole={currentUserRole || 'viewer'}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface MemberActionsProps {
  member: WorkspaceMember;
  onUpdateRole: (role: WorkspaceMemberRole) => void;
  onRemove: () => void;
  currentUserRole: WorkspaceMemberRole;
}

function MemberActions({ member, onUpdateRole, onRemove, currentUserRole }: MemberActionsProps) {
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  const [isConfirmRemove, setIsConfirmRemove] = useState(false);
  
  const canModify = (
    currentUserRole === 'owner' || 
    (currentUserRole === 'admin' && member.role !== 'owner')
  );
  
  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsChangeRoleOpen(true)}
        disabled={!canModify}
      >
        Change Role
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsConfirmRemove(true)}
        disabled={!canModify || member.role === 'owner'}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      
      {/* Change Role Dialog */}
      <Dialog open={isChangeRoleOpen} onOpenChange={setIsChangeRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Select a new role for this member
            </DialogDescription>
          </DialogHeader>
          
          <Select 
            defaultValue={member.role as string}
            onValueChange={(value: string) => {
              onUpdateRole(value as WorkspaceMemberRole);
              setIsChangeRoleOpen(false);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {currentUserRole === 'owner' && (
                <SelectItem value="owner">Workspace Owner</SelectItem>
              )}
              <SelectItem value="admin">Administrator</SelectItem>
              <SelectItem value="analyst">Analyst</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeRoleOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirm Remove Dialog */}
      <Dialog open={isConfirmRemove} onOpenChange={setIsConfirmRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from the workspace?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmRemove(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                onRemove();
                setIsConfirmRemove(false);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
