
import React from 'react';
import { Workspace } from '@/types/workspace';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Settings, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WorkspaceInfoCardProps {
  workspace: Workspace;
  userRole: string | null;
  onEditClick: () => void;
  onDeleteClick: () => void;
}

export function WorkspaceInfoCard({
  workspace,
  userRole,
  onEditClick,
  onDeleteClick,
}: WorkspaceInfoCardProps) {
  const isOwner = userRole === 'owner';
  const isAdmin = isOwner || userRole === 'admin';

  const RoleTag = ({ role }: { role: string }) => {
    const variants: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      analyst: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <Badge variant="outline" className={variants[role] || variants.viewer}>
        {role}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Workspace Settings
        </CardTitle>
        <CardDescription>
          Manage your workspace details and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Name</h3>
          <p className="text-sm text-muted-foreground">{workspace.name}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium">Description</h3>
          <p className="text-sm text-muted-foreground">
            {workspace.description || 'No description provided'}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium">Slug</h3>
          <p className="text-sm text-muted-foreground">{workspace.slug}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium">Your Role</h3>
          <RoleTag role={userRole || 'viewer'} />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {isAdmin && (
          <Button variant="outline" onClick={onEditClick}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Workspace
          </Button>
        )}
        {isOwner && (
          <Button variant="destructive" onClick={onDeleteClick}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Workspace
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
