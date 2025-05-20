
import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera } from 'lucide-react';
import { uploadFile } from '@/utils/storageUtils';
import { toast } from '@/components/ui/use-toast';

const Profile = () => {
  const { user, profile, updateProfile, roles } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  if (!user || !profile) {
    return null;
  }

  const getInitials = () => {
    if (displayName) {
      return displayName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    
    return user.email?.[0].toUpperCase() || 'U';
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      const file = event.target.files[0];
      
      // Use the storage utility to upload the file
      const result = await uploadFile('avatars', file, user.id);
      
      if (result.error) throw result.error;
      
      if (result.publicUrl) {
        setAvatarUrl(result.publicUrl);
        
        toast({
          title: "Avatar uploaded",
          description: "Your avatar has been uploaded successfully."
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    
    try {
      await updateProfile({
        id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const userRoleLabels = roles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ');

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <CardDescription>Update your account information.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarUrl || ''} />
                    <AvatarFallback className="bg-brand-100 text-brand-800 text-xl">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0">
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="rounded-full bg-brand-600 p-2 text-white shadow-sm hover:bg-brand-500 transition-colors">
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </div>
                      <Input
                        id="avatar-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-medium">{user.email}</p>
                  <p className="text-sm text-muted-foreground">{userRoleLabels}</p>
                </div>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input
                      id="display-name"
                      placeholder="Your display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={isUpdating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user.email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : "Update Profile"}
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Profile;
