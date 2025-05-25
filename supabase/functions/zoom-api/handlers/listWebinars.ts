
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { generateMonthlyDateRanges, fetchWebinarsForMonth } from '../utils/dateUtils.ts';

// Handle listing webinars with non-destructive upsert-based sync
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[zoom-api][list-webinars] Starting non-destructive sync for user: ${user.id}, force_sync: ${force_sync}`);
  console.log(`[zoom-api][list-webinars] Current timestamp: ${new Date().toISOString()}`);
  
  try {
    // If not forcing sync, first try to get webinars from database
    if (!force_sync) {
      console.log('[zoom-api][list-webinars] Checking database first for webinars');
      const { data: dbWebinars, error: dbError } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });
        
      // If we have webinars in the database and not forcing a refresh, return them
      if (!dbError && dbWebinars && dbWebinars.length > 0) {
        console.log(`[zoom-api][list-webinars] Found ${dbWebinars.length} webinars in database, returning cached data`);
        
        // Log comprehensive statistics about the cached data
        const now = new Date();
        const pastWebinars = dbWebinars.filter(w => new Date(w.start_time) < now);
        const futureWebinars = dbWebinars.filter(w => new Date(w.start_time) >= now);
        
        // Show date range of available data
        const sortedByDate = [...dbWebinars].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        const oldestDate = sortedByDate.length > 0 ? sortedByDate[0].start_time : null;
        const newestDate = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1].start_time : null;
        
        console.log(`[zoom-api][list-webinars] Historical data range: ${oldestDate} to ${newestDate}`);
        console.log(`[zoom-api][list-webinars] Cached data breakdown: ${pastWebinars.length} past, ${futureWebinars.length} future webinars`);
        
        return new Response(JSON.stringify({ 
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
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        console.log('[zoom-api][list-webinars] No webinars found in database or forcing refresh');
      }
    } else {
      console.log('[zoom-api][list-webinars] Force sync requested, bypassing database cache');
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

    // Generate monthly date ranges for the last 12 months
    const monthlyRanges = generateMonthlyDateRanges(12);
    console.log(`[zoom-api][list-webinars] Will fetch webinars for ${monthlyRanges.length} monthly periods`);
    
    // Fetch webinars for each month in parallel with detailed error handling
    const monthlyWebinarPromises = monthlyRanges.map(range => 
      fetchWebinarsForMonth(token, meData.id, range.from, range.to)
        .catch(error => {
          console.error(`[zoom-api][list-webinars] Failed to fetch webinars for ${range.from} to ${range.to}:`, error);
          return []; // Return empty array on error to continue with other months
        })
    );
    
    console.log(`[zoom-api][list-webinars] Starting ${monthlyWebinarPromises.length} parallel monthly API requests...`);
    const monthlyResults = await Promise.all(monthlyWebinarPromises);
    
    // Combine and deduplicate webinars from all months
    const allWebinars = [];
    const seenWebinarIds = new Set();
    let monthIndex = 0;
    
    for (const monthWebinars of monthlyResults) {
      const range = monthlyRanges[monthIndex];
      console.log(`[zoom-api][list-webinars] Processing results for month ${range.from} to ${range.to}: ${monthWebinars.length} webinars`);
      
      let newFromThisMonth = 0;
      for (const webinar of monthWebinars) {
        if (!seenWebinarIds.has(webinar.id)) {
          seenWebinarIds.add(webinar.id);
          allWebinars.push(webinar);
          newFromThisMonth++;
        }
      }
      
      console.log(`[zoom-api][list-webinars] Month ${range.from}: ${newFromThisMonth} unique webinars added`);
      monthIndex++;
    }
    
    console.log(`[zoom-api][12-month-fetch] Total unique webinars from 12-month historical fetch: ${allWebinars.length}`);
    
    // Also supplement with regular API for very recent webinars to ensure completeness
    console.log('[zoom-api][list-webinars] Supplementing with regular API for recent webinars');
    try {
      const recentResponse = await fetch(`https://api.zoom.us/v2/users/${meData.id}/webinars?page_size=300`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        const recentWebinars = recentData.webinars || [];
        
        // Add any recent webinars not already in our collection
        let newRecentCount = 0;
        for (const webinar of recentWebinars) {
          if (!seenWebinarIds.has(webinar.id)) {
            seenWebinarIds.add(webinar.id);
            allWebinars.push(webinar);
            newRecentCount++;
          }
        }
        console.log(`[zoom-api][list-webinars] Regular API page 1: added ${newRecentCount} new webinars`);
      }
    } catch (recentError) {
      console.warn('[zoom-api][list-webinars] Failed to fetch recent webinars, continuing with 12-month data:', recentError);
    }
    
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
    
    let newWebinars = 0;
    let updatedWebinars = 0;
    let preservedWebinars = 0;
    let totalWebinarsInDB = 0;
    let oldestPreservedDate = null;
    let newestWebinarDate = null;
    
    // Get existing webinars for comparison and preservation count
    const { data: existingWebinars, error: existingError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id);
      
    if (existingError) {
      console.error('[zoom-api][list-webinars] Error fetching existing webinars:', existingError);
    } else {
      totalWebinarsInDB = existingWebinars?.length || 0;
      console.log(`[zoom-api][list-webinars] Found ${totalWebinarsInDB} existing webinars in database`);
      
      // Calculate preserved webinars (those in DB but not in current API response)
      const apiWebinarIds = new Set(allWebinars.map(w => w.id.toString()));
      const preservedWebinarsList = existingWebinars?.filter(w => !apiWebinarIds.has(w.webinar_id)) || [];
      preservedWebinars = preservedWebinarsList.length;
      
      if (preservedWebinarsList.length > 0) {
        const sortedPreserved = preservedWebinarsList.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        oldestPreservedDate = sortedPreserved[0].start_time;
        console.log(`[zoom-api][list-webinars] Preserving ${preservedWebinars} historical webinars, oldest: ${oldestPreservedDate}`);
      }
    }
    
    // If there are webinars, process them with participant data for completed webinars
    if (allWebinars && allWebinars.length > 0) {
      // For each webinar, get participant counts for completed webinars
      const webinarsWithParticipantData = await Promise.all(
        allWebinars.map(async (webinar: any) => {
          // Only fetch participant data for completed webinars
          const webinarStartTime = new Date(webinar.start_time);
          const isCompleted = webinar.status === 'ended' || 
                             (webinarStartTime < new Date() && 
                              new Date().getTime() - webinarStartTime.getTime() > webinar.duration * 60 * 1000);
          
          if (isCompleted) {
            try {
              console.log(`[zoom-api][list-webinars] Fetching participants for completed webinar: ${webinar.id}`);
              
              // Make parallel requests for registrants and attendees
              const [registrantsRes, attendeesRes] = await Promise.all([
                fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/registrants?page_size=1`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }),
                fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}/participants?page_size=1`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                })
              ]);
              
              const [registrantsData, attendeesData] = await Promise.all([
                registrantsRes.ok ? registrantsRes.json() : { total_records: 0 },
                attendeesRes.ok ? attendeesRes.json() : { total_records: 0 }
              ]);
              
              // Enhance webinar object with participant counts
              return {
                ...webinar,
                registrants_count: registrantsData.total_records || 0,
                participants_count: attendeesData.total_records || 0
              };
            } catch (err) {
              console.error(`[zoom-api][list-webinars] Error fetching participants for webinar ${webinar.id}:`, err);
              // Continue with the original webinar data if there's an error
              return webinar;
            }
          } else {
            // Return original webinar data for upcoming webinars
            return webinar;
          }
        })
      );
      
      // Update the allWebinars with enhanced data
      allWebinars.splice(0, allWebinars.length, ...webinarsWithParticipantData);
      
      // ** NON-DESTRUCTIVE UPSERT APPROACH **
      // Instead of deleting all webinars, we'll upsert each one individually
      console.log(`[zoom-api][list-webinars] Starting non-destructive upsert for ${allWebinars.length} webinars...`);
      
      const currentTimestamp = new Date().toISOString();
      
      for (const webinar of allWebinars) {
        const webinarData = {
          user_id: user.id,
          webinar_id: webinar.id,
          webinar_uuid: webinar.uuid,
          topic: webinar.topic,
          start_time: webinar.start_time,
          duration: webinar.duration,
          timezone: webinar.timezone,
          agenda: webinar.agenda || '',
          host_email: webinar.host_email,
          status: webinar.status,
          type: webinar.type,
          raw_data: webinar,
          last_synced_at: currentTimestamp,
          updated_at: currentTimestamp
        };
        
        // Use UPSERT with ON CONFLICT to either insert new or update existing
        const { data: upsertData, error: upsertError } = await supabase
          .from('zoom_webinars')
          .upsert(webinarData, {
            onConflict: 'user_id,webinar_id',
            ignoreDuplicates: false
          })
          .select('webinar_id');
        
        if (upsertError) {
          console.error(`[zoom-api][list-webinars] Error upserting webinar ${webinar.id}:`, upsertError);
        } else {
          // Check if this was an insert (new) or update (existing)
          const existingWebinar = existingWebinars?.find(w => w.webinar_id === webinar.id.toString());
          if (!existingWebinar) {
            newWebinars++;
          } else {
            // Check if data actually changed to count as an update
            const hasChanges = 
              existingWebinar.topic !== webinar.topic ||
              existingWebinar.start_time !== webinar.start_time ||
              existingWebinar.duration !== webinar.duration ||
              existingWebinar.agenda !== webinar.agenda ||
              existingWebinar.status !== webinar.status ||
              JSON.stringify(existingWebinar.raw_data) !== JSON.stringify(webinar);
            
            if (hasChanges) {
              updatedWebinars++;
            }
          }
        }
      }
      
      // Get final count of all webinars in database
      const { data: finalWebinars, error: finalError } = await supabase
        .from('zoom_webinars')
        .select('start_time')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });
      
      if (!finalError && finalWebinars && finalWebinars.length > 0) {
        totalWebinarsInDB = finalWebinars.length;
        oldestPreservedDate = finalWebinars[0].start_time;
        newestWebinarDate = finalWebinars[finalWebinars.length - 1].start_time;
      }
      
      console.log(`[zoom-api][list-webinars] Upsert completed: ${newWebinars} new, ${updatedWebinars} updated, ${preservedWebinars} preserved`);
      
      // Record sync in history with enhanced statistics
      await supabase
        .from('zoom_sync_history')
        .insert({
          user_id: user.id,
          sync_type: 'webinars',
          status: 'success',
          items_synced: newWebinars + updatedWebinars,
          message: `Non-destructive sync: ${newWebinars} new, ${updatedWebinars} updated, ${preservedWebinars} preserved. Total: ${totalWebinarsInDB} webinars (${oldestPreservedDate ? `from ${oldestPreservedDate.split('T')[0]}` : 'all recent'})`
        });
    } else {
      // Record empty sync in history but still preserve existing data
      const { data: finalWebinars } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id);
      
      totalWebinarsInDB = finalWebinars?.length || 0;
      preservedWebinars = totalWebinarsInDB;
      
      await supabase
        .from('zoom_sync_history')
        .insert({
          user_id: user.id,
          sync_type: 'webinars',
          status: 'success',
          items_synced: 0,
          message: `No webinars found in API, preserved ${preservedWebinars} existing webinars in database`
        });
        
      console.log(`[zoom-api][list-webinars] No webinars found in API, but preserved ${preservedWebinars} existing webinars`);
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
    
    // Log comprehensive summary
    console.log('[zoom-api][list-webinars] === NON-DESTRUCTIVE SYNC SUMMARY ===');
    console.log(`  - Total webinars from API: ${allWebinars?.length || 0}`);
    console.log(`  - New webinars added: ${newWebinars}`);
    console.log(`  - Existing webinars updated: ${updatedWebinars}`);
    console.log(`  - Historical webinars preserved: ${preservedWebinars}`);
    console.log(`  - Total webinars in database: ${totalWebinarsInDB}`);
    console.log(`  - Historical data range: ${oldestPreservedDate ? oldestPreservedDate.split('T')[0] : 'N/A'} to ${newestWebinarDate ? newestWebinarDate.split('T')[0] : 'N/A'}`);
    console.log(`  - Force sync: ${force_sync}`);
    console.log('=== END NON-DESTRUCTIVE SYNC SUMMARY ===');
    
    return new Response(JSON.stringify({ 
      webinars: finalWebinarsList,
      source: 'api',
      syncResults: {
        itemsFetched: allWebinars?.length || 0,
        itemsUpdated: newWebinars + updatedWebinars,
        newWebinars: newWebinars,
        updatedWebinars: updatedWebinars,
        preservedWebinars: preservedWebinars,
        totalWebinars: totalWebinarsInDB,
        monthsSearched: 12,
        searchPeriods: monthlyRanges,
        dataRange: {
          oldest: oldestPreservedDate,
          newest: newestWebinarDate
        },
        preservedHistoricalData: preservedWebinars > 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[zoom-api][list-webinars] Error in action:', error);
    
    // Record failed sync in history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'webinars',
        status: 'error',
        items_synced: 0,
        message: error.message || 'Unknown error'
      });
    
    throw error; // Let the main error handler format the response
  }
}
