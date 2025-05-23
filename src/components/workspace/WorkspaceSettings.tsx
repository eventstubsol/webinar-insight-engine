
import React, { useState, useEffect } from 'react';
import { useWorkspace, WorkspaceMember } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { Trash2, Pencil, UserPlus, Settings } from 'lucide-react';

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
  
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
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

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      owner: 'Workspace Owner',
      admin: 'Administrator',
      analyst: 'Analyst',
      viewer: 'Viewer',
    };
    
    return roles[role] || role;
  };

  if (!currentWorkspace) {
    return <div>Please select a workspace</div>;
  }

  return (
    <div className="space-y-8">
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
            <p className="text-sm text-muted-foreground">{currentWorkspace.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium">Description</h3>
            <p className="text-sm text-muted-foreground">
              {currentWorkspace.description || 'No description provided'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium">Slug</h3>
            <p className="text-sm text-muted-foreground">{currentWorkspace.slug}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium">Your Role</h3>
            <RoleTag role={userRole || 'viewer'} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {isAdmin && (
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Workspace
            </Button>
          )}
          {isOwner && (
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Workspace
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Workspace Members</CardTitle>
            {isAdmin && (
              <Button variant="default" size="sm" onClick={() => setIsInviteDialogOpen(true)}>
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
                      user={{
                        name: member.profile?.display_name || 'User',
                        avatarUrl: member.profile?.avatar_url || undefined
                      }}
                    />
                    <span>{member.profile?.display_name || 'User'}</span>
                  </TableCell>
                  <TableCell>
                    <RoleTag role={member.role} />
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="flex gap-2">
                      <MemberActions
                        member={member}
                        onUpdateRole={async (role) => {
                          await updateWorkspaceMember(member.id, role);
                          loadMembers();
                        }}
                        onRemove={async () => {
                          await removeWorkspaceMember(member.id);
                          loadMembers();
                        }}
                        currentUserRole={userRole || 'viewer'}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Workspace Dialog */}
      <EditWorkspaceDialog
        workspace={currentWorkspace}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={async (data) => {
          await updateWorkspace(currentWorkspace.id, data);
          setIsEditDialogOpen(false);
        }}
      />

      {/* Delete Workspace Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the workspace "{currentWorkspace.name}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
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

interface MemberActionsProps {
  member: WorkspaceMember;
  onUpdateRole: (role: WorkspaceMember['role']) => void;
  onRemove: () => void;
  currentUserRole: WorkspaceMember['role'];
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
            defaultValue={member.role}
            onValueChange={(value) => {
              onUpdateRole(value as WorkspaceMember['role']);
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

interface EditWorkspaceDialogProps {
  workspace: {
    name: string;
    description: string | null;
  };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description: string }) => void;
}

function EditWorkspaceDialog({
  workspace,
  isOpen,
  onOpenChange,
  onSave,
}: EditWorkspaceDialogProps) {
  const formSchema = z.object({
    name: z.string().min(3, 'Workspace name must be at least 3 characters.'),
    description: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: workspace.name,
      description: workspace.description || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: workspace.name,
        description: workspace.description || '',
      });
    }
  }, [isOpen, workspace, form]);

  const { isSubmitting } = form.formState;

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSave({
      name: values.name,
      description: values.description || '',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Workspace</DialogTitle>
          <DialogDescription>
            Update your workspace details
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface InviteMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (email: string, role: WorkspaceMember['role']) => void;
}

function InviteMemberDialog({
  isOpen,
  onOpenChange,
  onInvite,
}: InviteMemberDialogProps) {
  const formSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    role: z.enum(['admin', 'analyst', 'viewer']),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      role: 'viewer' as const,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const { isSubmitting } = form.formState;

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onInvite(values.email, values.role);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Add a new member to your workspace
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Inviting...' : 'Invite Member'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
