
import React, { useState, useEffect } from 'react';
import { useWorkspace, WorkspaceMember } from '@/contexts/WorkspaceContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { UserPlus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

export default function WorkspaceMembersPage() {
  const { 
    currentWorkspace, 
    fetchWorkspaceMembers, 
    inviteWorkspaceMember,
    updateWorkspaceMember,
    removeWorkspaceMember,
    userRole
  } = useWorkspace();
  
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  
  const isAdmin = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    loadMembers();
  }, [currentWorkspace]);

  const loadMembers = async () => {
    if (!currentWorkspace) {
      setMembers([]);
      setIsLoading(false);
      return;
    }
    
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

  const handleInviteMember = async (email: string, role: WorkspaceMember['role']) => {
    if (!currentWorkspace) return;
    
    try {
      await inviteWorkspaceMember(currentWorkspace.id, email, role);
      await loadMembers();
      setIsInviteDialogOpen(false);
    } catch (error) {
      console.error('Error inviting member:', error);
    }
  };

  const handleUpdateRole = async (memberId: string, role: WorkspaceMember['role']) => {
    try {
      await updateWorkspaceMember(memberId, role);
      await loadMembers();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeWorkspaceMember(memberId);
      await loadMembers();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-lg border bg-card p-8 text-card-foreground shadow-sm flex flex-col items-center justify-center">
          <h2 className="text-xl font-semibold mb-2">No workspace selected</h2>
          <p className="text-muted-foreground mb-4">
            Please select a workspace to manage members
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspace Members</h1>
          <p className="text-muted-foreground">
            Manage members and their permissions in {currentWorkspace.name}
          </p>
        </div>
        
        {isAdmin && (
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Member</DialogTitle>
                <DialogDescription>
                  Add a new member to your workspace
                </DialogDescription>
              </DialogHeader>
              
              <InviteMemberForm onSubmit={handleInviteMember} />
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            People with access to this workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableCaption>
                {members.length === 0
                  ? 'No members in this workspace yet.'
                  : `Total ${members.length} members in workspace.`}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
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
                      <div>
                        <p>{member.profile?.display_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{member.user_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.joined_at).toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(userRole === 'owner' || (userRole === 'admin' && member.role !== 'owner')) && (
                            <Select
                              defaultValue={member.role}
                              onValueChange={(value) => {
                                handleUpdateRole(member.id, value as WorkspaceMember['role']);
                              }}
                              disabled={member.role === 'owner' && member.user_id === currentWorkspace.created_by}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {userRole === 'owner' && <SelectItem value="owner">Owner</SelectItem>}
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="analyst">Analyst</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          
                          {(userRole === 'owner' || (userRole === 'admin' && member.role !== 'owner')) && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={member.role === 'owner' && member.user_id === currentWorkspace.created_by}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
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
}

interface InviteMemberFormProps {
  onSubmit: (email: string, role: WorkspaceMember['role']) => void;
}

function InviteMemberForm({ onSubmit }: InviteMemberFormProps) {
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

  const { isSubmitting } = form.formState;

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit(values.email, values.role);
    form.reset();
  };

  return (
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
                  <SelectItem value="viewer">Viewer (Default)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Inviting...' : 'Invite Member'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
