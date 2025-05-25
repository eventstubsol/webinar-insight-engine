import React, { createContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { initializeStorage } from '@/integrations/supabase/storage';
import { AuthContextType, UserProfile, UserRole } from '@/types/auth';
import { cleanupAuthState, fetchUserProfile, fetchUserRoles, updateUserProfile } from '@/utils/authUtils';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export * from '@/hooks/useAuth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  
  // Fetch user profile and roles
  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const profileData = await fetchUserProfile(userId);
      if (profileData) {
        setProfile(profileData);
      } else {
        // If no profile exists, create a default one
        const defaultProfile: UserProfile = {
          id: userId,
          display_name: null,
          avatar_url: null
        };
        setProfile(defaultProfile);
      }
      
      // Fetch roles
      const rolesData = await fetchUserRoles(userId);
      setRoles(rolesData.length > 0 ? rolesData : ['viewer']); // Default to viewer if no roles
    } catch (error: any) {
      console.error('Error fetching user data:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize storage buckets
  useEffect(() => {
    initializeStorage().catch(err => {
      console.error("Failed to initialize storage buckets:", err);
    });
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (event === 'SIGNED_IN' && currentSession?.user) {
          // Defer data fetching to prevent deadlocks
          setTimeout(() => {
            fetchUserData(currentSession.user.id);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRoles([]);
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await fetchUserData(currentSession.user.id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setIsLoading(false);
      }
    };
    
    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Auth methods
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      // Clean up existing state
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      toast({
        title: "Login successful",
        description: "Welcome back to ZoomLytics!"
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      // Clean up existing state
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });
      
      if (error) throw error;
      
      // Create a profile for the new user
      if (data.user) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              display_name: name,
              avatar_url: null
            });
            
          if (profileError) {
            console.error('Error creating profile:', profileError);
          }
          
          // Assign default role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: data.user.id,
              role: 'viewer'
            });
            
          if (roleError) {
            console.error('Error assigning role:', roleError);
          }
        } catch (err) {
          console.error('Error setting up new user:', err);
        }
      }
      
      toast({
        title: "Registration successful",
        description: "Welcome to ZoomLytics!"
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      // Clean up auth state
      cleanupAuthState();
      
      await supabase.auth.signOut();
      
      toast({
        title: "Logged out",
        description: "You have been signed out"
      });
      
      // Force page reload for a clean state
      window.location.href = '/login';
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) throw error;
      
    } catch (error: any) {
      toast({
        title: "Google login failed",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  
  const signInWithZoom = async () => {
    try {
      setIsLoading(true);
      cleanupAuthState();
      
      // In development, simulate a successful login
      if (import.meta.env.DEV) {
        console.log('Simulating Zoom login in development mode');
        setTimeout(() => {
          toast({
            title: "Development Mode",
            description: "Zoom login simulated in development mode",
            variant: "default"
          });
          setIsLoading(false);
          navigate('/dashboard');
        }, 1000);
        return;
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'zoom',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) throw error;
      
    } catch (error: any) {
      toast({
        title: "Zoom login failed",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) throw new Error('User not logged in');
      
      const data = await updateUserProfile(user.id, updates);
      
      setProfile({ ...profile, ...updates } as UserProfile);
      
      return data; // This returns the updated profile data
    } catch (error: any) {
      throw error;
    }
  };

  const value = {
    session,
    user,
    profile,
    roles,
    isLoading,
    isAdmin: roles.includes('admin'),
    isHost: roles.includes('host') || roles.includes('admin'),
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithZoom,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};