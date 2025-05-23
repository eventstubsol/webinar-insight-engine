
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

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

/**
 * Hook to handle workspace-scoped data operations
 */
export function useWorkspaceData() {
  const { currentWorkspace } = useWorkspace();

  /**
   * Get data from a table with workspace filtering
   */
  const getFromWorkspace = useCallback(async <T extends Record<string, any>>(
    table: ValidTableName,
    columns: string = '*',
    additionalFilters?: (query: any) => any
  ): Promise<T[]> => {
    if (!currentWorkspace) {
      console.warn('No workspace selected, cannot fetch data');
      return [];
    }

    try {
      let query = supabase
        .from(table)
        .select(columns)
        .eq('workspace_id', currentWorkspace.id);
      
      if (additionalFilters) {
        query = additionalFilters(query);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`Error fetching ${table} data:`, error);
        throw error;
      }
      
      return (data || []) as T[];
    } catch (error) {
      console.error(`Error in getFromWorkspace:`, error);
      throw error;
    }
  }, [currentWorkspace]);

  /**
   * Insert data into a table with workspace_id
   */
  const insertToWorkspace = useCallback(async <T extends Record<string, any>>(
    table: ValidTableName,
    data: Omit<T, 'workspace_id'> | Omit<T, 'workspace_id'>[],
    options?: { returning?: boolean }
  ): Promise<T[]> => {
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
      
      let query = supabase
        .from(table)
        .insert(dataWithWorkspace);
      
      if (options?.returning !== false) {
        query = query.select();
      }
      
      const { data: result, error } = await query;
      
      if (error) {
        console.error(`Error inserting into ${table}:`, error);
        throw error;
      }
      
      return (result || []) as T[];
    } catch (error) {
      console.error(`Error in insertToWorkspace:`, error);
      throw error;
    }
  }, [currentWorkspace]);

  /**
   * Update data in a table with workspace filtering
   */
  const updateInWorkspace = useCallback(async <T extends Record<string, any>>(
    table: ValidTableName,
    id: string | number,
    updates: Partial<T>,
    options?: { idField?: string; returning?: boolean }
  ): Promise<T | null> => {
    if (!currentWorkspace) {
      console.warn('No workspace selected, cannot update data');
      throw new Error('No workspace selected');
    }

    try {
      const idField = options?.idField || 'id';
      
      let query = supabase
        .from(table)
        .update(updates)
        .eq(idField, id)
        .eq('workspace_id', currentWorkspace.id);
      
      if (options?.returning !== false) {
        query = query.select();
      }
      
      if (options?.returning !== false) {
        query = query.single();
      }
      
      const { data: result, error } = await query;
      
      if (error) {
        console.error(`Error updating in ${table}:`, error);
        throw error;
      }
      
      return result as T | null;
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
      
      const { error } = await supabase
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
