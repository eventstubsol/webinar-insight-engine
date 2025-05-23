
import React from 'react';
import { WorkspaceSettings } from '@/components/workspace/WorkspaceSettings';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function WorkspaceSettingsPage() {
  const { isLoading, currentWorkspace } = useWorkspace();

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-lg border bg-card p-8 text-card-foreground shadow-sm flex flex-col items-center justify-center">
          <h2 className="text-xl font-semibold mb-2">No workspace selected</h2>
          <p className="text-muted-foreground mb-4">
            Please select a workspace to manage settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{currentWorkspace.name} Settings</h1>
        <p className="text-muted-foreground">
          Manage workspace details and members
        </p>
      </div>
      
      <WorkspaceSettings />
    </div>
  );
}
