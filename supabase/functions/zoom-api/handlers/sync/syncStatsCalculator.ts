
/**
 * Calculate comprehensive sync statistics and data ranges with aggressive timeout protection metrics
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
  
  // Log comprehensive summary with aggressive timeout protection
  console.log('[zoom-api][calculateSyncStats] === OPTIMIZED NON-DESTRUCTIVE SYNC WITH AGGRESSIVE TIMEOUT PROTECTION ===');
  console.log(`  - Total webinars from API: ${apiWebinarsCount || 0}`);
  console.log(`  - New webinars added: ${newWebinars}`);
  console.log(`  - Existing webinars updated: ${updatedWebinars}`);
  console.log(`  - Historical webinars preserved: ${preservedWebinars}`);
  console.log(`  - Total webinars in database: ${totalWebinarsInDB}`);
  console.log(`  - Historical data range: ${oldestPreservedDate ? oldestPreservedDate.split('T')[0] : 'N/A'} to ${newestWebinarDate ? newestWebinarDate.split('T')[0] : 'N/A'}`);
  console.log(`  - Aggressive timeout protection: ENABLED`);
  console.log(`  - Volume limiting: ENABLED`);
  console.log('=== END OPTIMIZED NON-DESTRUCTIVE SYNC WITH AGGRESSIVE TIMEOUT PROTECTION ===');
  
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
 * Record sync operation in history table with enhanced aggressive timeout protection metrics
 */
export async function recordSyncHistory(
  supabase: any,
  userId: string,
  syncType: string,
  status: string,
  itemsSynced: number,
  message: string
) {
  try {
    // Get enhanced registrant statistics from the database with timeout protection metrics
    const { data: registrantData, error: registrantError } = await supabase
      .from('zoom_webinar_participants')
      .select('webinar_id, participant_type')
      .eq('user_id', userId)
      .eq('participant_type', 'registrant');
    
    const registrantStats = registrantError ? 0 : (registrantData?.length || 0);
    const uniqueWebinarsWithRegistrants = registrantError ? 0 : 
      new Set(registrantData?.map(r => r.webinar_id) || []).size;
    
    // Enhanced message with detailed aggressive timeout protection information
    const enhancedMessage = message + 
      (registrantStats > 0 
        ? ` ${registrantStats} registrants synced across ${uniqueWebinarsWithRegistrants} webinars using aggressive timeout protection with batch processing.`
        : ' No registrants found or batch processing was disabled due to timeout protection.');
    
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: userId,
        sync_type: syncType,
        status: status,
        items_synced: itemsSynced,
        message: enhancedMessage,
        sync_details: {
          registrants_synced: registrantStats,
          webinars_with_registrants: uniqueWebinarsWithRegistrants,
          batch_processing_enabled: true,
          enhanced_with_registrants: true,
          sync_optimization: 'aggressive_timeout_protection_with_batch_processing',
          aggressive_timeout_protection: true,
          volume_limiting_enabled: true,
          timestamp: new Date().toISOString()
        }
      });
      
    console.log(`[zoom-api][sync-stats] Enhanced sync history recorded with aggressive timeout protection and batch-processed registrant statistics: ${registrantStats} registrants across ${uniqueWebinarsWithRegistrants} webinars`);
  } catch (error) {
    console.error(`[zoom-api][sync-stats] Error recording enhanced sync history with aggressive timeout protection:`, error);
  }
}
