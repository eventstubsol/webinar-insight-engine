
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { fetchWebinarsFromZoomAPI, performNonDestructiveUpsert } from './sync/nonDestructiveSync.ts';
import { enhanceWebinarsWithParticipantData } from './sync/participantDataProcessor.ts';
import { calculateSyncStats, recordSyncHistory } from './sync/syncStatsCalculator.ts';
import { checkDatabaseCache } from './sync/databaseCache.ts';

// Handle listing webinars with non-destructive upsert-based sync
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[zoom-api][list-webinars] Starting non-destructive sync for user: ${user.id}, force_sync: ${force_sync}`);
  console.log(`[zoom-api][list-webinars] Current timestamp: ${new Date().toISOString()}`);
  
  try {
    // Check database cache first if not forcing sync
    const cacheResult = await checkDatabaseCache(supabase, user.id, force_sync);
    if (cacheResult.shouldUseCachedData) {
      return new Response(JSON.stringify(cacheResult.cacheResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get token and fetch from Zoom API
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    console.log('[zoom-api][list-webinars] Got Zoom token, fetching webinars using 12-month historical intervals');
    
    // First try to get the user's email
    const meResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!meResponse.ok) {
      const meData = await meResponse.json();
      console.error('[zoom-api][list-webinars] Failed to get user info:', meData);
      
      // Handle missing OAuth scopes error specifically
      if (meData.code === 4711 || meData.message?.includes('scopes')) {
        throw new Error('Missing required OAuth scopes in your Zoom App. Please add these scopes to your Zoom Server-to-Server OAuth app: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin');
      }
      
      // Handle other API error codes
      if (meData.code === 124) {
        throw new Error('Invalid Zoom access token. Please check your credentials.');
      } else if (meData.code === 1001) {
        throw new Error('User not found or does not exist in this account.');
      } else {
        throw new Error(`Failed to get user info: ${meData.message || 'Unknown error'}`);
      }
    }
    
    const meData = await meResponse.json();
    console.log(`[zoom-api][list-webinars] Got user info for: ${meData.email}, ID: ${meData.id}`);

    // Fetch webinars from Zoom API
    const allWebinars = await fetchWebinarsFromZoomAPI(token, meData.id);
    
    // Log detailed statistics about the fetched data
    console.log(`[zoom-api][list-webinars] Final data analysis:`);
    console.log(`  - Total webinars fetched from all sources: ${allWebinars.length}`);
    
    if (allWebinars.length > 0) {
      // Analyze the date distribution
      const now = new Date();
      const pastWebinars = allWebinars.filter(w => new Date(w.start_time) < now);
      const futureWebinars = allWebinars.filter(w => new Date(w.start_time) >= now);
      
      console.log(`  - Past webinars: ${pastWebinars.length}`);
      console.log(`  - Future webinars: ${futureWebinars.length}`);
      
      // Show oldest and newest webinars from API
      const sortedByDate = [...allWebinars].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      if (sortedByDate.length > 0) {
        console.log(`  - Oldest API webinar: ${sortedByDate[0].id} on ${sortedByDate[0].start_time}`);
        console.log(`  - Newest API webinar: ${sortedByDate[sortedByDate.length - 1].id} on ${sortedByDate[sortedByDate.length - 1].start_time}`);
      }
      
      // Show status distribution
      const statusCounts = {};
      allWebinars.forEach(w => {
        statusCounts[w.status] = (statusCounts[w.status] || 0) + 1;
      });
      console.log(`  - Status distribution:`, statusCounts);
    }
    
    // Get existing webinars for comparison and preservation count
    const { data: existingWebinars, error: existingError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id);
      
    if (existingError) {
      console.error('[zoom-api][list-webinars] Error fetching existing webinars:', existingError);
    }
    
    let syncResults = { newWebinars: 0, updatedWebinars: 0, preservedWebinars: 0 };
    let statsResult = {
      totalWebinarsInDB: 0,
      oldestPreservedDate: null,
      newestWebinarDate: null,
      dataRange: { oldest: null, newest: null }
    };
    
    // If there are webinars, process them with participant data for completed webinars
    if (allWebinars && allWebinars.length > 0) {
      // Enhance webinars with participant data
      const enhancedWebinars = await enhanceWebinarsWithParticipantData(allWebinars, token);
      
      // Perform non-destructive upsert
      syncResults = await performNonDestructiveUpsert(supabase, user.id, enhancedWebinars, existingWebinars || []);
      
      // Calculate comprehensive statistics
      statsResult = await calculateSyncStats(supabase, user.id, syncResults, allWebinars.length);
      
      // Record sync in history with enhanced statistics
      await recordSyncHistory(
        supabase,
        user.id,
        'webinars',
        'success',
        syncResults.newWebinars + syncResults.updatedWebinars,
        `Non-destructive sync: ${syncResults.newWebinars} new, ${syncResults.updatedWebinars} updated, ${syncResults.preservedWebinars} preserved. Total: ${statsResult.totalWebinarsInDB} webinars (${statsResult.oldestPreservedDate ? `from ${statsResult.oldestPreservedDate.split('T')[0]}` : 'all recent'})`
      );
    } else {
      // Record empty sync in history but still preserve existing data
      const { data: finalWebinars } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id);
      
      statsResult.totalWebinarsInDB = finalWebinars?.length || 0;
      syncResults.preservedWebinars = statsResult.totalWebinarsInDB;
      
      await recordSyncHistory(
        supabase,
        user.id,
        'webinars',
        'success',
        0,
        `No webinars found in API, preserved ${syncResults.preservedWebinars} existing webinars in database`
      );
        
      console.log(`[zoom-api][list-webinars] No webinars found in API, but preserved ${syncResults.preservedWebinars} existing webinars`);
    }
    
    // Get final webinar list to return (including preserved historical data)
    const { data: allDbWebinars, error: allDbError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });
    
    const finalWebinarsList = allDbWebinars?.map(w => ({
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
    })) || [];
    
    return new Response(JSON.stringify({ 
      webinars: finalWebinarsList,
      source: 'api',
      syncResults: {
        itemsFetched: allWebinars?.length || 0,
        itemsUpdated: syncResults.newWebinars + syncResults.updatedWebinars,
        newWebinars: syncResults.newWebinars,
        updatedWebinars: syncResults.updatedWebinars,
        preservedWebinars: syncResults.preservedWebinars,
        totalWebinars: statsResult.totalWebinarsInDB,
        monthsSearched: 12,
        searchPeriods: [], // Could include monthly ranges if needed
        dataRange: statsResult.dataRange,
        preservedHistoricalData: syncResults.preservedWebinars > 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[zoom-api][list-webinars] Error in action:', error);
    
    // Record failed sync in history
    await recordSyncHistory(
      supabase,
      user.id,
      'webinars',
      'error',
      0,
      error.message || 'Unknown error'
    );
    
    throw error; // Let the main error handler format the response
  }
}
