
import React, { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { PlusCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreateWorkspaceForm } from './CreateWorkspaceForm';
import { cn } from '@/lib/utils';

interface WorkspaceSwitcherProps {
  className?: string;
}

export function WorkspaceSwitcher({ className }: WorkspaceSwitcherProps) {
  const { workspaces, currentWorkspace, selectWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn('w-60 justify-between truncate font-normal', className)}
          >
            {currentWorkspace?.name || 'Select workspace'}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map(workspace => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => {
                selectWorkspace(workspace.id);
                setOpen(false);
              }}
              className="flex items-center justify-between"
            >
              <span className="truncate">{workspace.name}</span>
              {workspace.id === currentWorkspace?.id && (
                <CheckCircle2 className="h-4 w-4 text-primary ml-2" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => {
              e.preventDefault();
              setCreateDialogOpen(true);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Create workspace</span>
            </DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new workspace</DialogTitle>
        </DialogHeader>
        <CreateWorkspaceForm onSuccess={() => setCreateDialogOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
