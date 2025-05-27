
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { recordSyncHistory } from './sync/syncStatsCalculator.ts';
import { checkDatabaseCache } from './sync/databaseCache.ts';
import { fetchUserInfo } from './sync/userInfoFetcher.ts';

// Handle listing webinars with MINIMAL processing to prevent timeouts
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[zoom-api][list-webinars] Starting MINIMAL sync for user: ${user.id}, force_sync: ${force_sync}`);
  console.log(`[zoom-api][list-webinars] Minimal approach: fetch basic list only, skip all enhancements`);
  console.log(`[zoom-api][list-webinars] Current timestamp: ${new Date().toISOString()}`);
  
  try {
    // Check database cache first if not forcing sync
    const cacheResult = await checkDatabaseCache(supabase, user.id, force_sync);
    if (cacheResult.shouldUseCachedData) {
      console.log('[zoom-api][list-webinars] Using cached data, skipping API call');
      return new Response(JSON.stringify(cacheResult.cacheResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get token and fetch user info
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    console.log('[zoom-api][list-webinars] Got Zoom token, fetching user info');
    
    const meData = await fetchUserInfo(token);
    console.log(`[zoom-api][list-webinars] Got user info for: ${meData.email}, ID: ${meData.id}`);

    // Fetch ONLY basic webinar list from Zoom API - NO ENHANCEMENTS
    console.log('[zoom-api][list-webinars] Fetching basic webinar list from Zoom API');
    const allWebinars = await fetchBasicWebinarList(token, meData.id);
    
    console.log(`[zoom-api][list-webinars] Retrieved ${allWebinars.length} webinars from Zoom API`);
    
    // Store basic webinar data without any enhancements
    const syncResults = await storeBasicWebinarData(supabase, user.id, allWebinars);
    
    // Record minimal sync in history
    await recordSyncHistory(
      supabase,
      user.id,
      'webinars',
      'success',
      syncResults.processed,
      `Minimal sync completed: ${syncResults.processed} webinars stored. Use individual webinar view for detailed data.`
    );
    
    console.log('[zoom-api][list-webinars] ✅ MINIMAL sync completed successfully');
    console.log('[zoom-api][list-webinars] 💡 Individual webinars will be enhanced on-demand when viewed');
    
    // Get final webinar list to return
    const { data: finalWebinarsList, error: fetchError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });
      
    if (fetchError) {
      console.error('[zoom-api][list-webinars] Error fetching final webinars:', fetchError);
      throw new Error(`Failed to fetch webinars: ${fetchError.message}`);
    }
    
    return new Response(JSON.stringify({
      webinars: finalWebinarsList || [],
      sync_type: 'minimal',
      message: 'Webinars synced with minimal processing. Individual webinars will be enhanced when viewed.',
      stats: {
        total_webinars: allWebinars.length,
        stored_webinars: syncResults.processed,
        enhancement_mode: 'on-demand'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[zoom-api][list-webinars] Error in minimal sync:', error);
    
    // Record failed sync in history
    await recordSyncHistory(
      supabase,
      user.id,
      'webinars',
      'error',
      0,
      error.message || 'Unknown error during minimal sync'
    );
    
    throw error; // Let the main error handler format the response
  }
}

// Fetch basic webinar list without any enhancements
async function fetchBasicWebinarList(token: string, userId: string) {
  console.log('[zoom-api][fetchBasicWebinarList] Fetching basic webinar list');
  
  const allWebinars: any[] = [];
  let nextPageToken = '';
  let pageNumber = 1;
  
  do {
    const url = new URL('https://api.zoom.us/v2/users/me/webinars');
    url.searchParams.set('page_size', '300');
    url.searchParams.set('type', 'all');
    if (nextPageToken) {
      url.searchParams.set('next_page_token', nextPageToken);
    }
    
    console.log(`[zoom-api][fetchBasicWebinarList] Fetching page ${pageNumber}`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[zoom-api][fetchBasicWebinarList] API error:', errorData);
      throw new Error(`Failed to fetch webinars: ${errorData.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    if (data.webinars && data.webinars.length > 0) {
      allWebinars.push(...data.webinars);
      console.log(`[zoom-api][fetchBasicWebinarList] Page ${pageNumber}: ${data.webinars.length} webinars`);
    }
    
    nextPageToken = data.next_page_token || '';
    pageNumber++;
    
  } while (nextPageToken && pageNumber <= 10); // Safety limit
  
  console.log(`[zoom-api][fetchBasicWebinarList] Total webinars fetched: ${allWebinars.length}`);
  return allWebinars;
}

// Store basic webinar data without enhancements
async function storeBasicWebinarData(supabase: any, userId: string, webinars: any[]) {
  console.log('[zoom-api][storeBasicWebinarData] Storing basic webinar data');
  
  let processed = 0;
  
  for (const webinar of webinars) {
    try {
      const { error } = await supabase
        .from('zoom_webinars')
        .upsert({
          user_id: userId,
          webinar_id: webinar.id,
          webinar_uuid: webinar.uuid || '',
          topic: webinar.topic,
          start_time: webinar.start_time,
          duration: webinar.duration,
          timezone: webinar.timezone,
          agenda: webinar.agenda || '',
          host_email: null, // Will be enhanced on-demand
          host_id: webinar.host_id || null,
          host_name: null, // Will be enhanced on-demand
          status: webinar.status,
          type: webinar.type,
          raw_data: webinar,
          last_synced_at: new Date().toISOString(),
          // Enhanced data fields will be null until individual enhancement
          host_first_name: null,
          host_last_name: null,
          actual_start_time: null,
          actual_duration: null
        }, {
          onConflict: 'user_id,webinar_id'
        });
      
      if (error) {
        console.error(`[zoom-api][storeBasicWebinarData] Error storing webinar ${webinar.id}:`, error);
      } else {
        processed++;
      }
    } catch (err) {
      console.error(`[zoom-api][storeBasicWebinarData] Exception storing webinar ${webinar.id}:`, err);
    }
  }
  
  console.log(`[zoom-api][storeBasicWebinarData] Stored ${processed}/${webinars.length} webinars`);
  return { processed };
}
