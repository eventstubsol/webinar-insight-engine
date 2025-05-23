
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

/**
 * Hook to handle workspace-scoped data operations
 */
export function useWorkspaceData() {
  const { currentWorkspace } = useWorkspace();

  /**
   * Get data from a table with workspace filtering
   */
  const getFromWorkspace = useCallback(async <T extends Record<string, any>>(
    table: string,
    columns: string = '*',
    additionalFilters?: (query: any) => any
  ): Promise<T[]> => {
    if (!currentWorkspace) {
      console.warn('No workspace selected, cannot fetch data');
      return [];
    }

    let query = supabase
      .from(table as any)
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
    
    return data as T[];
  }, [currentWorkspace]);

  /**
   * Insert data into a table with workspace_id
   */
  const insertToWorkspace = useCallback(async <T extends Record<string, any>>(
    table: string,
    data: Omit<T, 'workspace_id'> | Omit<T, 'workspace_id'>[],
    options?: { returning?: boolean }
  ): Promise<T[]> => {
    if (!currentWorkspace) {
      console.warn('No workspace selected, cannot insert data');
      throw new Error('No workspace selected');
    }

    const dataArray = Array.isArray(data) ? data : [data];
    const dataWithWorkspace = dataArray.map(item => ({
      ...item,
      workspace_id: currentWorkspace.id
    }));
    
    const query = supabase
      .from(table as any)
      .insert(dataWithWorkspace as any);
    
    if (options?.returning !== false) {
      query.select();
    }
    
    const { data: responseData, error } = await query;
    
    if (error) {
      console.error(`Error inserting into ${table}:`, error);
      throw error;
    }
    
    return responseData as T[];
  }, [currentWorkspace]);

  /**
   * Update data in a table with workspace filtering
   */
  const updateInWorkspace = useCallback(async <T extends Record<string, any>>(
    table: string,
    id: string | number,
    updates: Partial<T>,
    options?: { idField?: string; returning?: boolean }
  ): Promise<T | null> => {
    if (!currentWorkspace) {
      console.warn('No workspace selected, cannot update data');
      throw new Error('No workspace selected');
    }

    const idField = options?.idField || 'id';
    
    const query = supabase
      .from(table as any)
      .update(updates)
      .eq(idField, id)
      .eq('workspace_id', currentWorkspace.id);
    
    if (options?.returning !== false) {
      query.select().single();
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error updating in ${table}:`, error);
      throw error;
    }
    
    return data as T;
  }, [currentWorkspace]);

  /**
   * Delete data from a table with workspace filtering
   */
  const deleteFromWorkspace = useCallback(async (
    table: string,
    id: string | number,
    options?: { idField?: string }
  ): Promise<void> => {
    if (!currentWorkspace) {
      console.warn('No workspace selected, cannot delete data');
      throw new Error('No workspace selected');
    }

    const idField = options?.idField || 'id';
    
    const { error } = await supabase
      .from(table as any)
      .delete()
      .eq(idField, id)
      .eq('workspace_id', currentWorkspace.id);
    
    if (error) {
      console.error(`Error deleting from ${table}:`, error);
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
