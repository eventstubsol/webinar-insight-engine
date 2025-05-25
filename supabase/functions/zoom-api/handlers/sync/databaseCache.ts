
/**
 * Check and return cached webinars from database if force_sync is false
 */
export async function checkDatabaseCache(
  supabase: any,
  userId: string,
  force_sync: boolean
): Promise<{ shouldUseCachedData: boolean; cachedWebinars?: any[]; cacheResponse?: any }> {
  if (force_sync) {
    console.log('[zoom-api][checkDatabaseCache] Force sync requested, bypassing database cache');
    return { shouldUseCachedData: false };
  }
  
  console.log('[zoom-api][checkDatabaseCache] Checking database first for webinars');
  const { data: dbWebinars, error: dbError } = await supabase
    .from('zoom_webinars')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });
    
  // If we have webinars in the database and not forcing a refresh, return them
  if (!dbError && dbWebinars && dbWebinars.length > 0) {
    console.log(`[zoom-api][checkDatabaseCache] Found ${dbWebinars.length} webinars in database, returning cached data`);
    
    // Log comprehensive statistics about the cached data
    const now = new Date();
    const pastWebinars = dbWebinars.filter(w => new Date(w.start_time) < now);
    const futureWebinars = dbWebinars.filter(w => new Date(w.start_time) >= now);
    
    // Show date range of available data
    const sortedByDate = [...dbWebinars].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const oldestDate = sortedByDate.length > 0 ? sortedByDate[0].start_time : null;
    const newestDate = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1].start_time : null;
    
    console.log(`[zoom-api][checkDatabaseCache] Historical data range: ${oldestDate} to ${newestDate}`);
    console.log(`[zoom-api][checkDatabaseCache] Cached data breakdown: ${pastWebinars.length} past, ${futureWebinars.length} future webinars`);
    
    const cacheResponse = { 
      webinars: dbWebinars.map(w => ({
        id: w.webinar_id,
        uuid: w.webinar_uuid,
        topic: w.topic,
        start_time: w.start_time,
        duration: w.duration,
        timezone: w.timezone,
        agenda: w.agenda || '',
        host_email: w.host_email,
        status: w.status,
        type: w.type,
        ...w.raw_data
      })),
      source: 'database',
      syncResults: {
        itemsFetched: dbWebinars.length, 
        itemsUpdated: 0,
        preservedHistorical: dbWebinars.length,
        dataRange: { oldest: oldestDate, newest: newestDate }
      }
    };
    
    return { 
      shouldUseCachedData: true, 
      cachedWebinars: dbWebinars,
      cacheResponse 
    };
  } else {
    console.log('[zoom-api][checkDatabaseCache] No webinars found in database or forcing refresh');
    return { shouldUseCachedData: false };
  }
}
