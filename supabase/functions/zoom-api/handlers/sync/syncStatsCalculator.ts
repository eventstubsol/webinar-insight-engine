
/**
 * Calculate comprehensive sync statistics and data ranges
 */
export async function calculateSyncStats(
  supabase: any,
  userId: string,
  syncResults: { newWebinars: number; updatedWebinars: number; preservedWebinars: number },
  apiWebinarsCount: number
): Promise<{
  totalWebinarsInDB: number;
  oldestPreservedDate: string | null;
  newestWebinarDate: string | null;
  dataRange: { oldest: string | null; newest: string | null };
}> {
  const { newWebinars, updatedWebinars, preservedWebinars } = syncResults;
  
  // Get final count and date range of all webinars in database
  const { data: finalWebinars, error: finalError } = await supabase
    .from('zoom_webinars')
    .select('start_time')
    .eq('user_id', userId)
    .order('start_time', { ascending: true });
  
  let totalWebinarsInDB = 0;
  let oldestPreservedDate = null;
  let newestWebinarDate = null;
  
  if (!finalError && finalWebinars && finalWebinars.length > 0) {
    totalWebinarsInDB = finalWebinars.length;
    oldestPreservedDate = finalWebinars[0].start_time;
    newestWebinarDate = finalWebinars[finalWebinars.length - 1].start_time;
  }
  
  // Log comprehensive summary
  console.log('[zoom-api][calculateSyncStats] === NON-DESTRUCTIVE SYNC SUMMARY ===');
  console.log(`  - Total webinars from API: ${apiWebinarsCount || 0}`);
  console.log(`  - New webinars added: ${newWebinars}`);
  console.log(`  - Existing webinars updated: ${updatedWebinars}`);
  console.log(`  - Historical webinars preserved: ${preservedWebinars}`);
  console.log(`  - Total webinars in database: ${totalWebinarsInDB}`);
  console.log(`  - Historical data range: ${oldestPreservedDate ? oldestPreservedDate.split('T')[0] : 'N/A'} to ${newestWebinarDate ? newestWebinarDate.split('T')[0] : 'N/A'}`);
  console.log('=== END NON-DESTRUCTIVE SYNC SUMMARY ===');
  
  return {
    totalWebinarsInDB,
    oldestPreservedDate,
    newestWebinarDate,
    dataRange: {
      oldest: oldestPreservedDate,
      newest: newestWebinarDate
    }
  };
}

/**
 * Record sync operation in history table
 */
export async function recordSyncHistory(
  supabase: any,
  userId: string,
  syncType: string,
  status: 'success' | 'error',
  itemsSynced: number,
  message: string
): Promise<void> {
  await supabase
    .from('zoom_sync_history')
    .insert({
      user_id: userId,
      sync_type: syncType,
      status: status,
      items_synced: itemsSynced,
      message: message
    });
}
