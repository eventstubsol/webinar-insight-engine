
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

interface UserAvatarProps {
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ className }) => {
  const { user, profile } = useAuth();

  if (!user) {
    return null;
  }

  // Get initials from display name or email
  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    
    return user.email?.[0].toUpperCase() || 'U';
  };

  return (
    <Avatar className={className}>
      <AvatarImage src={profile?.avatar_url || ''} />
      <AvatarFallback className="bg-brand-100 text-brand-800">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
};
