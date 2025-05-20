
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'host' | 'viewer';

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  roles: UserRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isHost: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithZoom: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<any>;
}
