
import React from 'react';
import { UserPlus } from 'lucide-react';
import { WorkspaceMember, WorkspaceMemberRole } from '@/types/workspace';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { WorkspaceMembersTable } from './WorkspaceMembersTable';

interface MembersCardProps {
  members: WorkspaceMember[];
  isLoading: boolean;
  isAdmin: boolean;
  currentUserRole: WorkspaceMemberRole | null;
  onInviteClick: () => void;
  onUpdateRole: (memberId: string, role: WorkspaceMemberRole) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
}

export function MembersCard({
  members,
  isLoading,
  isAdmin,
  currentUserRole,
  onInviteClick,
  onUpdateRole,
  onRemoveMember,
}: MembersCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Workspace Members</CardTitle>
          {isAdmin && (
            <Button variant="default" size="sm" onClick={onInviteClick}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          )}
        </div>
        <CardDescription>
          Manage members and their permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <WorkspaceMembersTable
          members={members}
          isLoading={isLoading}
          isAdmin={isAdmin}
          currentUserRole={currentUserRole}
          onUpdateRole={onUpdateRole}
          onRemoveMember={onRemoveMember}
        />
      </CardContent>
    </Card>
  );
}
