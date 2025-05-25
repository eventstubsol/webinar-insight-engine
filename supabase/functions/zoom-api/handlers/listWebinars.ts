
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { generateMonthlyDateRanges, fetchWebinarsForMonth } from '../utils/dateUtils.ts';

// Handle listing webinars with enhanced 12-month fetching and detailed logging
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[zoom-api][list-webinars] Starting action for user: ${user.id}, force_sync: ${force_sync}`);
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
        
        // Log some statistics about the cached data
        const now = new Date();
        const pastWebinars = dbWebinars.filter(w => new Date(w.start_time) < now);
        const futureWebinars = dbWebinars.filter(w => new Date(w.start_time) >= now);
        
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
            itemsUpdated: 0
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
      
      // Show oldest and newest webinars
      const sortedByDate = [...allWebinars].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      if (sortedByDate.length > 0) {
        console.log(`  - Oldest webinar: ${sortedByDate[0].id} on ${sortedByDate[0].start_time}`);
        console.log(`  - Newest webinar: ${sortedByDate[sortedByDate.length - 1].id} on ${sortedByDate[sortedByDate.length - 1].start_time}`);
      }
      
      // Show status distribution
      const statusCounts = {};
      allWebinars.forEach(w => {
        statusCounts[w.status] = (statusCounts[w.status] || 0) + 1;
      });
      console.log(`  - Status distribution:`, statusCounts);
    }
    
    let itemsUpdated = 0;
    let newWebinars = 0;
    let updatedWebinars = 0;
    let removedWebinars = 0;
    let existingWebinars = [];
    
    // If there are webinars, process them with participant data for completed webinars
    if (allWebinars && allWebinars.length > 0) {
      // Get existing webinars for comparison
      const { data: existingData } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id);
        
      existingWebinars = existingData || [];
      console.log(`[zoom-api][list-webinars] Found ${existingWebinars.length} existing webinars in database for comparison`);
      
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
      
      // Compare and detect changes
      for (const webinar of allWebinars) {
        const existing = existingWebinars.find(w => w.webinar_id === webinar.id.toString());
        
        if (!existing) {
          newWebinars++;
          itemsUpdated++;
        } else if (
          existing.topic !== webinar.topic ||
          existing.start_time !== webinar.start_time ||
          existing.duration !== webinar.duration ||
          existing.agenda !== webinar.agenda ||
          existing.status !== webinar.status ||
          JSON.stringify(existing.raw_data) !== JSON.stringify(webinar)) {
          updatedWebinars++;
          itemsUpdated++;
        }
      }
      
      // Check for removed webinars (exist in DB but not in API)
      const apiWebinarIds = new Set(allWebinars.map(w => w.id.toString()));
      removedWebinars = existingWebinars.filter(w => !apiWebinarIds.has(w.webinar_id)).length;
      
      console.log(`[zoom-api][list-webinars] Change detection: ${newWebinars} new, ${updatedWebinars} updated, ${removedWebinars} removed webinars`);
      
      // If changes detected or force sync, update the database
      if (itemsUpdated > 0 || removedWebinars > 0 || force_sync) {
        console.log(`[zoom-api][list-webinars] Updating database with changes...`);
        
        // First delete existing webinars for this user
        const { error: deleteError } = await supabase
          .from('zoom_webinars')
          .delete()
          .eq('user_id', user.id);
        
        if (deleteError) {
          console.error('[zoom-api][list-webinars] Error deleting existing webinars:', deleteError);
        }
        
        // Insert new webinars
        const webinarsToInsert = allWebinars.map((webinar: any) => ({
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
          raw_data: webinar
        }));
        
        const { error: insertError } = await supabase
          .from('zoom_webinars')
          .insert(webinarsToInsert);
        
        if (insertError) {
          console.error('[zoom-api][list-webinars] Error inserting webinars:', insertError);
        }
        
        // Record sync in history
        await supabase
          .from('zoom_sync_history')
          .insert({
            user_id: user.id,
            sync_type: 'webinars',
            status: 'success',
            items_synced: webinarsToInsert.length,
            message: `Successfully synced ${webinarsToInsert.length} webinars (${newWebinars} new, ${updatedWebinars} updated, ${removedWebinars} removed) using 12-month historical intervals`
          });
          
        console.log(`[zoom-api][list-webinars] Database updated with ${webinarsToInsert.length} webinars`);
      } else {
        // Record sync but note no changes
        await supabase
          .from('zoom_sync_history')
          .insert({
            user_id: user.id,
            sync_type: 'webinars',
            status: 'success',
            items_synced: 0,
            message: `No changes detected in ${allWebinars.length} webinars from 12-month historical fetch`
          });
          
        console.log('[zoom-api][list-webinars] No changes detected, database not updated');
      }
    } else {
      // Record empty sync in history
      await supabase
        .from('zoom_sync_history')
        .insert({
          user_id: user.id,
          sync_type: 'webinars',
          status: 'success',
          items_synced: 0,
          message: 'No webinars found in 12-month historical fetch'
        });
        
      console.log('[zoom-api][list-webinars] No webinars found in Zoom account');
    }
    
    // Log comprehensive summary
    console.log('[zoom-api][list-webinars] === COMPREHENSIVE SYNC SUMMARY ===');
    console.log(`  - Total webinars from API: ${allWebinars.length}`);
    console.log(`  - Historical periods searched: 12 months`);
    console.log(`  - New webinars: ${newWebinars}`);
    console.log(`  - Updated webinars: ${updatedWebinars}`);
    console.log(`  - Removed webinars: ${removedWebinars}`);
    console.log(`  - Force sync: ${force_sync}`);
    console.log('=== END SYNC SUMMARY ===');
    
    return new Response(JSON.stringify({ 
      webinars: allWebinars || [],
      source: 'api',
      syncResults: {
        itemsFetched: allWebinars?.length || 0,
        itemsUpdated: itemsUpdated,
        newWebinars: newWebinars,
        updatedWebinars: updatedWebinars,
        removedWebinars: removedWebinars,
        monthsSearched: 12,
        searchPeriods: monthlyRanges
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
