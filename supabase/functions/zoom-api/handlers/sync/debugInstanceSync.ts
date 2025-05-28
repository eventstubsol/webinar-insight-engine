
/**
 * Debug utility for instance sync operations
 */

export function logInstanceSyncDebug(message: string, data?: any) {
  console.log(`[INSTANCE-SYNC-DEBUG] ${message}`);
  if (data) {
    console.log(`[INSTANCE-SYNC-DEBUG] Data:`, JSON.stringify(data, null, 2));
  }
}

export function validateInstanceData(instanceData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!instanceData.user_id) errors.push('Missing user_id');
  if (!instanceData.webinar_id) errors.push('Missing webinar_id');
  if (!instanceData.instance_id) errors.push('Missing instance_id');
  if (!instanceData.webinar_uuid) errors.push('Missing webinar_uuid');
  
  // Check for null raw_data
  if (!instanceData.raw_data) {
    errors.push('Missing raw_data - this will cause database constraint violations');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function verifyInstancesInDatabase(supabase: any, userId: string): Promise<{ count: number; sampleData: any[] }> {
  try {
    const { data, error, count } = await supabase
      .from('zoom_webinar_instances')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .limit(5);
    
    if (error) {
      console.error('[INSTANCE-SYNC-DEBUG] Error querying instances:', error);
      return { count: 0, sampleData: [] };
    }
    
    console.log(`[INSTANCE-SYNC-DEBUG] Found ${count} instances in database`);
    if (data && data.length > 0) {
      console.log('[INSTANCE-SYNC-DEBUG] Sample instance data:', data[0]);
    }
    
    return { count: count || 0, sampleData: data || [] };
  } catch (error) {
    console.error('[INSTANCE-SYNC-DEBUG] Exception in verifyInstancesInDatabase:', error);
    return { count: 0, sampleData: [] };
  }
}
