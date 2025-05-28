
import { generateMonthlyDateRanges, fetchWebinarsForMonth } from '../../utils/dateUtils.ts';

/**
 * Fetch webinars from Zoom API using 12-month historical approach with improved error handling
 */
export async function fetchWebinarsFromZoomAPI(token: string, userId: string): Promise<any[]> {
  console.log('[zoom-api][fetchWebinarsFromZoomAPI] Starting 12-month historical fetch');
  
  // Generate monthly date ranges for the last 12 months
  const monthlyRanges = generateMonthlyDateRanges(12);
  console.log(`[zoom-api][fetchWebinarsFromZoomAPI] Will fetch webinars for ${monthlyRanges.length} monthly periods`);
  
  // Fetch webinars for each month in smaller chunks to avoid timeouts
  const allWebinars = [];
  const seenWebinarIds = new Set();
  
  // Process in chunks of 6 months to avoid hitting function timeout
  const chunkSize = 6;
  for (let i = 0; i < monthlyRanges.length; i += chunkSize) {
    const chunk = monthlyRanges.slice(i, i + chunkSize);
    console.log(`[zoom-api][fetchWebinarsFromZoomAPI] Processing chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(monthlyRanges.length/chunkSize)}`);
    
    const chunkPromises = chunk.map(range => 
      fetchWebinarsForMonth(token, userId, range.from, range.to)
        .catch(error => {
          console.error(`[zoom-api][fetchWebinarsFromZoomAPI] Failed to fetch webinars for ${range.from} to ${range.to}:`, error);
          return []; // Return empty array on error to continue with other months
        })
    );
    
    const chunkResults = await Promise.all(chunkPromises);
    
    // Process results from this chunk
    let chunkIndex = 0;
    for (const monthWebinars of chunkResults) {
      const range = chunk[chunkIndex];
      console.log(`[zoom-api][fetchWebinarsFromZoomAPI] Processing results for month ${range.from} to ${range.to}: ${monthWebinars.length} webinars`);
      
      let newFromThisMonth = 0;
      for (const webinar of monthWebinars) {
        if (!seenWebinarIds.has(webinar.id)) {
          seenWebinarIds.add(webinar.id);
          allWebinars.push(webinar);
          newFromThisMonth++;
        }
      }
      
      console.log(`[zoom-api][fetchWebinarsFromZoomAPI] Month ${range.from}: ${newFromThisMonth} unique webinars added`);
      chunkIndex++;
    }
  }
  
  console.log(`[zoom-api][12-month-fetch] Total unique webinars from 12-month historical fetch: ${allWebinars.length}`);
  
  // Also supplement with regular API for very recent webinars to ensure completeness
  console.log('[zoom-api][fetchWebinarsFromZoomAPI] Supplementing with regular API for recent webinars');
  try {
    const recentResponse = await fetch(`https://api.zoom.us/v2/users/${userId}/webinars?page_size=300`, {
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
      console.log(`[zoom-api][fetchWebinarsFromZoomAPI] Regular API page 1: added ${newRecentCount} new webinars`);
    }
  } catch (recentError) {
    console.warn('[zoom-api][fetchWebinarsFromZoomAPI] Failed to fetch recent webinars, continuing with 12-month data:', recentError);
  }
  
  return allWebinars;
}

/**
 * Perform non-destructive upsert of webinars into database with comprehensive field mapping
 */
export async function performNonDestructiveUpsert(
  supabase: any, 
  userId: string, 
  webinars: any[], 
  existingWebinars: any[]
): Promise<{ newWebinars: number; updatedWebinars: number; preservedWebinars: number }> {
  console.log(`[zoom-api][performNonDestructiveUpsert] Starting comprehensive upsert for ${webinars.length} webinars...`);
  
  let newWebinars = 0;
  let updatedWebinars = 0;
  const currentTimestamp = new Date().toISOString();
  
  // Log detailed info about actual timing data before upserting
  const webinarsWithActualTiming = webinars.filter(w => w.actual_start_time || w.actual_duration);
  console.log(`[zoom-api][performNonDestructiveUpsert] 🕒 TIMING DATA CHECK:`);
  console.log(`[zoom-api][performNonDestructiveUpsert] - Total webinars to upsert: ${webinars.length}`);
  console.log(`[zoom-api][performNonDestructiveUpsert] - Webinars with actual timing data: ${webinarsWithActualTiming.length}`);
  
  // Log sample of webinars with timing data
  if (webinarsWithActualTiming.length > 0) {
    console.log(`[zoom-api][performNonDestructiveUpsert] Sample webinars with timing data:`);
    webinarsWithActualTiming.slice(0, 3).forEach(w => {
      console.log(`[zoom-api][performNonDestructiveUpsert] - Webinar ${w.id}: actual_start_time=${w.actual_start_time}, actual_duration=${w.actual_duration}`);
    });
  }
  
  // Process webinars in smaller batches to avoid timeouts
  const batchSize = 10;
  for (let i = 0; i < webinars.length; i += batchSize) {
    const batch = webinars.slice(i, i + batchSize);
    console.log(`[zoom-api][performNonDestructiveUpsert] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(webinars.length/batchSize)}`);
    
    for (const webinar of batch) {
      try {
        // Extract actual timing data from webinar response
        const actualStartTime = webinar.actual_start_time || 
                                webinar.start_time_actual || 
                                webinar.actualStartTime || 
                                null;
                                
        const actualDuration = webinar.actual_duration || 
                               webinar.duration_actual || 
                               webinar.actualDuration || 
                               null;

        // Log timing data for each webinar that has it
        if (actualStartTime || actualDuration) {
          console.log(`[zoom-api][performNonDestructiveUpsert] 🎯 Webinar ${webinar.id} has timing data: start=${actualStartTime}, duration=${actualDuration}`);
        }

        // Comprehensive field mapping - extracting all available data
        const webinarData = {
          user_id: userId,
          webinar_id: webinar.id,
          webinar_uuid: webinar.uuid,
          topic: webinar.topic,
          start_time: webinar.start_time,
          duration: webinar.duration,
          actual_start_time: actualStartTime,
          actual_duration: actualDuration,
          timezone: webinar.timezone,
          agenda: webinar.agenda || '',
          host_email: webinar.host_email,
          status: webinar.status,
          type: webinar.type,
          
          // URL FIELDS - Available in raw_data but previously not mapped
          join_url: webinar.join_url,
          registration_url: webinar.registration_url,
          start_url: webinar.start_url,
          password: webinar.password,
          
          // TIMESTAMP FIELDS - Available in raw_data but previously not mapped  
          webinar_created_at: webinar.created_at,
          
          // HOST FIELDS - Enhanced host info but previously not mapped
          host_id: webinar.host_info?.id || webinar.host_id,
          host_name: webinar.host_info?.display_name || webinar.host_name,
          host_first_name: webinar.host_info?.first_name || webinar.host_first_name,
          host_last_name: webinar.host_info?.last_name || webinar.host_last_name,
          
          // CONFIGURATION FIELDS - Available in raw_data but previously not mapped
          is_simulive: webinar.is_simulive !== undefined ? webinar.is_simulive : false,
          
          // Settings fields (from enhanced data or basic webinar data)
          approval_type: webinar.settings?.approval_type || webinar.approval_type,
          registration_type: webinar.settings?.registration_type || webinar.registration_type,
          auto_recording_type: webinar.settings?.auto_recording || webinar.auto_recording,
          
          // Boolean settings with defaults
          enforce_login: webinar.settings?.enforce_login !== undefined ? webinar.settings.enforce_login : false,
          on_demand: webinar.settings?.on_demand !== undefined ? webinar.settings.on_demand : false,
          practice_session: webinar.settings?.practice_session !== undefined ? webinar.settings.practice_session : false,
          hd_video: webinar.settings?.hd_video !== undefined ? webinar.settings.hd_video : false,
          host_video: webinar.settings?.host_video !== undefined ? webinar.settings.host_video : true,
          panelists_video: webinar.settings?.panelists_video !== undefined ? webinar.settings.panelists_video : true,
          
          // Audio and language settings
          audio_type: webinar.settings?.audio || webinar.audio || 'both',
          language: webinar.language || 'en-US',
          
          // Contact info (if available)
          contact_name: webinar.settings?.contact_name || webinar.contact_name,
          contact_email: webinar.settings?.contact_email || webinar.contact_email,
          
          // Raw data and timestamps
          raw_data: webinar,
          last_synced_at: currentTimestamp,
          updated_at: currentTimestamp
        };
        
        // Log the actual data being upserted for webinars with timing
        if (webinarData.actual_start_time || webinarData.actual_duration) {
          console.log(`[zoom-api][performNonDestructiveUpsert] 📝 Upserting timing data for webinar ${webinar.id}:`);
          console.log(`[zoom-api][performNonDestructiveUpsert]   - actual_start_time: ${webinarData.actual_start_time}`);
          console.log(`[zoom-api][performNonDestructiveUpsert]   - actual_duration: ${webinarData.actual_duration}`);
        }
        
        // Use UPSERT with ON CONFLICT to either insert new or update existing
        const { error: upsertError } = await supabase
          .from('zoom_webinars')
          .upsert(webinarData, {
            onConflict: 'user_id,webinar_id',
            ignoreDuplicates: false
          });
        
        if (upsertError) {
          console.error(`[zoom-api][performNonDestructiveUpsert] ❌ Error upserting webinar ${webinar.id}:`, upsertError);
        } else {
          // Check if this was an insert (new) or update (existing)
          const existingWebinar = existingWebinars?.find(w => w.webinar_id === webinar.id.toString());
          if (!existingWebinar) {
            newWebinars++;
            console.log(`[zoom-api][performNonDestructiveUpsert] ✅ New webinar added: ${webinar.id}`);
          } else {
            // Check if data actually changed to count as an update
            const hasChanges = 
              existingWebinar.topic !== webinar.topic ||
              existingWebinar.start_time !== webinar.start_time ||
              existingWebinar.duration !== webinar.duration ||
              existingWebinar.actual_start_time !== actualStartTime ||
              existingWebinar.actual_duration !== actualDuration ||
              existingWebinar.agenda !== webinar.agenda ||
              existingWebinar.status !== webinar.status ||
              existingWebinar.join_url !== webinar.join_url ||
              existingWebinar.host_name !== (webinar.host_info?.display_name || webinar.host_name) ||
              JSON.stringify(existingWebinar.raw_data) !== JSON.stringify(webinar);
            
            if (hasChanges) {
              updatedWebinars++;
              console.log(`[zoom-api][performNonDestructiveUpsert] ✅ Webinar updated: ${webinar.id}`);
              
              // Log specific timing updates
              if (existingWebinar.actual_start_time !== actualStartTime || existingWebinar.actual_duration !== actualDuration) {
                console.log(`[zoom-api][performNonDestructiveUpsert] 🔄 Timing data updated for webinar ${webinar.id}:`);
                console.log(`[zoom-api][performNonDestructiveUpsert]   - actual_start_time: ${existingWebinar.actual_start_time} → ${actualStartTime}`);
                console.log(`[zoom-api][performNonDestructiveUpsert]   - actual_duration: ${existingWebinar.actual_duration} → ${actualDuration}`);
              }
            }
          }
        }
      } catch (webinarError) {
        console.error(`[zoom-api][performNonDestructiveUpsert] Error processing webinar ${webinar.id}:`, webinarError);
        // Continue with next webinar
      }
    }
  }
  
  // Calculate preserved webinars (those in DB but not in current API response)
  const apiWebinarIds = new Set(webinars.map(w => w.id.toString()));
  const preservedWebinarsList = existingWebinars?.filter(w => !apiWebinarIds.has(w.webinar_id)) || [];
  const preservedWebinars = preservedWebinarsList.length;
  
  console.log(`[zoom-api][performNonDestructiveUpsert] 🎉 Comprehensive upsert completed: ${newWebinars} new, ${updatedWebinars} updated, ${preservedWebinars} preserved`);
  
  // Final timing data summary
  const finalTimingCount = webinars.filter(w => w.actual_start_time || w.actual_duration).length;
  console.log(`[zoom-api][performNonDestructiveUpsert] 📊 Final timing data summary: ${finalTimingCount}/${webinars.length} webinars have actual timing data`);
  
  return { newWebinars, updatedWebinars, preservedWebinars };
}
