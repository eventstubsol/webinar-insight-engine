
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

// Cast supabase to any to prevent TypeScript from attempting to expand deep generics
const sb: any = supabase;

// Define a type for valid table names to address the type error
type ValidTableName = 
  | 'workspaces' 
  | 'profiles' 
  | 'user_roles' 
  | 'workspace_members' 
  | 'zoom_credentials' 
  | 'zoom_sync_history' 
  | 'zoom_webinar_chat'
  | 'zoom_webinar_engagement'
  | 'zoom_webinar_instance_participants'
  | 'zoom_webinar_instances'
  | 'zoom_webinar_participants'
  | 'zoom_webinar_poll_responses'
  | 'zoom_webinar_polls'
  | 'zoom_webinar_questions'
  | 'zoom_webinar_recordings'
  | 'zoom_webinars';

// Break the recursive type inference by using a simpler type
type SupabaseQueryResult = {
  data: any[] | null;
  error: any;
};

/**
 * Hook to handle workspace-scoped data operations
 */
export function useWorkspaceData() {
  const { currentWorkspace } = useWorkspace();

  /**
   * Get data from a table with workspace filtering
   */
  const getFromWorkspace = useCallback(
    async (
      table: ValidTableName,
      columns: string = '*',
      additionalFilters?: (query: any) => any
    ): Promise<any[]> => {
      if (!currentWorkspace) {
        console.warn('No workspace selected, cannot fetch data');
        return [];
      }

      try {
        // Create the base query with the correct table and workspace filtering
        // Use sb (supabase cast to any) to prevent infinite type expansion
        let query = sb
          .from(table)
          .select(columns)
          .eq('workspace_id', currentWorkspace.id);
        
        // Apply any additional filters if provided
        if (additionalFilters) {
          query = additionalFilters(query);
        }
        
        // Execute the query
        const { data, error } = await query;
        
        if (error) {
          console.error(`Error fetching ${table} data:`, error);
          throw error;
        }
        
        return data || [];
      } catch (error) {
        console.error(`Error in getFromWorkspace:`, error);
        throw error;
      }
    }, [currentWorkspace]);

  /**
   * Insert data into a table with workspace_id
   */
  const insertToWorkspace = useCallback(
    async (
      table: ValidTableName,
      data: Record<string, any> | Record<string, any>[],
      options?: { returning?: boolean }
    ): Promise<any[]> => {
      if (!currentWorkspace) {
        console.warn('No workspace selected, cannot insert data');
        throw new Error('No workspace selected');
      }

      try {
        const dataArray = Array.isArray(data) ? data : [data];
        const dataWithWorkspace = dataArray.map(item => ({
          ...item,
          workspace_id: currentWorkspace.id
        }));
        
        // Use sb (supabase cast to any) to prevent infinite type expansion
        const { data: result, error } = await sb
          .from(table)
          .insert(dataWithWorkspace)
          .select(options?.returning !== false ? '*' : undefined);
        
        if (error) {
          console.error(`Error inserting into ${table}:`, error);
          throw error;
        }
        
        return result || [];
      } catch (error) {
        console.error(`Error in insertToWorkspace:`, error);
        throw error;
      }
    }, [currentWorkspace]);

  /**
   * Update data in a table with workspace filtering
   */
  const updateInWorkspace = useCallback(
    async (
      table: ValidTableName,
      id: string | number,
      updates: Record<string, any>,
      options?: { idField?: string; returning?: boolean }
    ): Promise<any | null> => {
      if (!currentWorkspace) {
        console.warn('No workspace selected, cannot update data');
        throw new Error('No workspace selected');
      }

      try {
        const idField = options?.idField || 'id';
        
        // Use sb (supabase cast to any) to prevent infinite type expansion
        let query = sb
          .from(table)
          .update(updates)
          .eq(idField, id)
          .eq('workspace_id', currentWorkspace.id);
        
        // Add select clause if needed
        if (options?.returning !== false) {
          query = query.select('*');
        }
        
        // Execute the query
        const { data, error } = await query;
        
        if (error) {
          console.error(`Error updating in ${table}:`, error);
          throw error;
        }
        
        if (!data || !Array.isArray(data) || data.length === 0) {
          return null;
        }
        
        return data[0];
      } catch (error) {
        console.error(`Error in updateInWorkspace:`, error);
        throw error;
      }
    }, [currentWorkspace]);

  /**
   * Delete data from a table with workspace filtering
   */
  const deleteFromWorkspace = useCallback(async (
    table: ValidTableName,
    id: string | number,
    options?: { idField?: string }
  ): Promise<void> => {
    if (!currentWorkspace) {
      console.warn('No workspace selected, cannot delete data');
      throw new Error('No workspace selected');
    }

    try {
      const idField = options?.idField || 'id';
      
      // Use sb (supabase cast to any) to prevent infinite type expansion
      const { error } = await sb
        .from(table)
        .delete()
        .eq(idField, id)
        .eq('workspace_id', currentWorkspace.id);
      
      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`Error in deleteFromWorkspace:`, error);
      throw error;
    }
  }, [currentWorkspace]);

  return {
    getFromWorkspace,
    insertToWorkspace,
    updateInWorkspace,
    deleteFromWorkspace,
    workspaceId: currentWorkspace?.id
  };
}
