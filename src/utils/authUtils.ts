
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
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
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
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return data?.map(r => r.role as UserRole) || [];
  } catch (error: any) {
    console.error('Error fetching user roles:', error.message);
    return [];
  }
};

/**
 * Update user profile in Supabase
 */
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  try {
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
