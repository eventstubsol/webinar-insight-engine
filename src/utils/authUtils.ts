import { supabase } from "@/integrations/supabase/client";
import { UserProfile, UserRole } from "@/types/auth";
import { toast } from "@/components/ui/use-toast";

/**
 * Clean up authentication state
 */
export const cleanupAuthState = () => {
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

/**
 * Fetch user profile data from Supabase
 */
export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    // Check if we're in development mode
    if (import.meta.env.DEV) {
      console.log('[fetchUserProfile] Using mock profile in development mode');
      // Return mock profile in development
      return {
        id: userId,
        display_name: 'Development User',
        avatar_url: null
      };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', userId)
      .single();
    
    if (error) {
      // If the error is that the profile doesn't exist, create one
      if (error.code === 'PGRST116') {
        try {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              display_name: null,
              avatar_url: null
            })
            .select()
            .single();
            
          if (insertError) throw insertError;
          return newProfile;
        } catch (insertErr) {
          console.error('Error creating profile:', insertErr);
          return null;
        }
      }
      
      throw error;
    }
    
    return data;
  } catch (error: any) {
    console.error('Error fetching user profile:', error.message);
    return null;
  }
};

/**
 * Fetch user roles from Supabase
 */
export const fetchUserRoles = async (userId: string): Promise<UserRole[]> => {
  try {
    // Check if we're in development mode
    if (import.meta.env.DEV) {
      console.log('[fetchUserRoles] Using mock roles in development mode');
      // Return mock roles in development
      return ['admin', 'host'];
    }
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) {
      // If there's an error, try to create a default role
      try {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'viewer'
          });
          
        if (insertError) throw insertError;
        return ['viewer'];
      } catch (insertErr) {
        console.error('Error creating default role:', insertErr);
        return ['viewer']; // Return default role anyway
      }
    }
    
    return data?.map(r => r.role as UserRole) || ['viewer']; // Default to viewer if no roles
  } catch (error: any) {
    console.error('Error fetching user roles:', error.message);
    return ['viewer']; // Default to viewer on error
  }
};

/**
 * Update user profile in Supabase
 */
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  try {
    // Check if we're in development mode
    if (import.meta.env.DEV) {
      console.log('[updateUserProfile] Simulating profile update in development mode:', updates);
      // Simulate successful update
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully (development mode)"
      });
      return { ...updates, id: userId };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    toast({
      title: "Profile updated",
      description: "Your profile has been updated successfully"
    });
    
    return data;
  } catch (error: any) {
    toast({
      title: "Update failed",
      description: error.message,
      variant: "destructive"
    });
    throw error;
  }
};