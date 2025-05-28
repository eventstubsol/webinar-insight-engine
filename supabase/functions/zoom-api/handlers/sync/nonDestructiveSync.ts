
import { generateMonthlyDateRanges, fetchWebinarsForMonth } from '../../utils/dateUtils.ts';
import { fetchAllWebinarsWithProperEndpoints } from './historicalWebinarFetcher.ts';

/**
 * FIXED: Use proper API endpoints for historical and upcoming webinars
 */
export async function fetchWebinarsFromZoomAPI(token: string, userId: string): Promise<any[]> {
  console.log('[zoom-api][fetchWebinarsFromZoomAPI] 🚀 CRITICAL FIX: Using proper API endpoints for webinar data');
  
  try {
    // COMPREHENSIVE FIX: Use dual-endpoint strategy
    const webinarResult = await fetchAllWebinarsWithProperEndpoints(token, userId);
    
    console.log(`[zoom-api][fetchWebinarsFromZoomAPI] 🎉 FIXED ENDPOINT STRATEGY RESULTS:`);
    console.log(`[zoom-api][fetchWebinarsFromZoomAPI]   - Total webinars retrieved: ${webinarResult.totalRetrieved}`);
    console.log(`[zoom-api][fetchWebinarsFromZoomAPI]   - API calls made: ${webinarResult.apiCallsMade}`);
    console.log(`[zoom-api][fetchWebinarsFromZoomAPI]   - Endpoints used: ${webinarResult.sourceEndpoints.join(', ')}`);
    
    // Log field mapping debug information
    webinarResult.fieldMappingDebug.forEach((debug, index) => {
      console.log(`[zoom-api][fetchWebinarsFromZoomAPI] 🔍 FIELD MAPPING DEBUG ${index + 1}:`);
      console.log(`[zoom-api][fetchWebinarsFromZoomAPI]   - Source: ${debug.source}`);
      console.log(`[zoom-api][fetchWebinarsFromZoomAPI]   - Available fields: ${debug.availableFields.join(', ')}`);
    });
    
    // Verify topic field mapping fix
    const webinarsWithTopics = webinarResult.webinars.filter(w => w.topic && w.topic !== 'Untitled Webinar');
    const webinarsWithoutTopics = webinarResult.webinars.filter(w => !w.topic || w.topic === 'Untitled Webinar');
    
    console.log(`[zoom-api][fetchWebinarsFromZoomAPI] 📊 TOPIC FIELD MAPPING VERIFICATION:`);
    console.log(`[zoom-api][fetchWebinarsFromZoomAPI]   - Webinars with proper topics: ${webinarsWithTopics.length}`);
    console.log(`[zoom-api][fetchWebinarsFromZoomAPI]   - Webinars with missing topics: ${webinarsWithoutTopics.length}`);
    
    if (webinarsWithoutTopics.length > 0) {
      console.warn(`[zoom-api][fetchWebinarsFromZoomAPI] ⚠️ Still have ${webinarsWithoutTopics.length} webinars with missing topics`);
      webinarsWithoutTopics.slice(0, 3).forEach(w => {
        console.log(`[zoom-api][fetchWebinarsFromZoomAPI] Missing topic debug:`, {
          id: w.id,
          originalTopic: w.topic,
          rawTopicField: w.raw_data?.topic,
          allTopicFields: Object.keys(w.raw_data || {}).filter(k => k.toLowerCase().includes('topic') || k.toLowerCase().includes('title') || k.toLowerCase().includes('subject'))
        });
      });
    }
    
    return webinarResult.webinars;
    
  } catch (error) {
    console.error('[zoom-api][fetchWebinarsFromZoomAPI] ❌ CRITICAL ERROR in fixed endpoint strategy:', error);
    
    // FALLBACK: Try old method if new method fails
    console.log('[zoom-api][fetchWebinarsFromZoomAPI] 🔄 Falling back to old 12-month fetch method');
    return await fetchWebinarsFromZoomAPIFallback(token, userId);
  }
}

/**
 * Fallback to old method if new endpoints fail
 */
async function fetchWebinarsFromZoomAPIFallback(token: string, userId: string): Promise<any[]> {
  console.log('[zoom-api][fetchWebinarsFromZoomAPI] 🔄 FALLBACK: Using old 12-month historical fetch');
  
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
 * FIXED: Perform focused upsert with proper field validation and no assumptions
 */
export async function performNonDestructiveUpsert(
  supabase: any, 
  userId: string, 
  webinars: any[], 
  existingWebinars: any[]
): Promise<{ newWebinars: number; updatedWebinars: number; preservedWebinars: number }> {
  console.log(`[zoom-api][performNonDestructiveUpsert] 🔧 FIXED: Starting focused upsert for ${webinars.length} webinars`);
  console.log(`[zoom-api][performNonDestructiveUpsert] 🎯 CRITICAL FIX: Proper field validation, no field assumptions`);
  
  let newWebinars = 0;
  let updatedWebinars = 0;
  const currentTimestamp = new Date().toISOString();
  
  // Track enhanced data separately
  const webinarsWithActualTiming = webinars.filter(w => w._enhanced_with_past_data === true);
  console.log(`[zoom-api][performNonDestructiveUpsert] 📊 Enhanced webinars: ${webinarsWithActualTiming.length}/${webinars.length}`);
  
  // Process webinars in smaller batches to avoid timeouts
  const batchSize = 10;
  for (let i = 0; i < webinars.length; i += batchSize) {
    const batch = webinars.slice(i, i + batchSize);
    console.log(`[zoom-api][performNonDestructiveUpsert] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(webinars.length/batchSize)}`);
    
    for (const webinar of batch) {
      try {
        // FIXED: Strict field validation - only use data that's explicitly set
        const actualStartTime = webinar.actual_start_time ?? null;
        const actualDuration = webinar.actual_duration ?? null;
        const actualEndTime = webinar.actual_end_time ?? null;
        const participantsCount = webinar.participants_count ?? null;

        // Log enhanced data properly
        if (webinar._enhanced_with_past_data) {
          console.log(`[zoom-api][performNonDestructiveUpsert] 🎯 Enhanced webinar ${webinar.id}:`);
          console.log(`[zoom-api][performNonDestructiveUpsert]   - actual_start_time: ${actualStartTime}`);
          console.log(`[zoom-api][performNonDestructiveUpsert]   - actual_duration: ${actualDuration}`);
          console.log(`[zoom-api][performNonDestructiveUpsert]   - actual_end_time: ${actualEndTime}`);
          console.log(`[zoom-api][performNonDestructiveUpsert]   - participants_count: ${participantsCount}`);
        }

        // CRITICAL FIX: Better topic field handling
        let finalTopic = 'Untitled Webinar';
        if (webinar.topic && webinar.topic !== 'Untitled Webinar') {
          finalTopic = webinar.topic;
        } else if (webinar.title) {
          finalTopic = webinar.title;
        } else if (webinar.subject) {
          finalTopic = webinar.subject;
        } else if (webinar.webinar_name) {
          finalTopic = webinar.webinar_name;
        }
        
        console.log(`[zoom-api][performNonDestructiveUpsert] 📝 Topic mapping for ${webinar.id}: "${finalTopic}"`);

        // FIXED: Focused field mapping - only fields guaranteed to exist in basic webinar API
        const webinarData = {
          user_id: userId,
          webinar_id: webinar.id,
          webinar_uuid: webinar.uuid ?? null,
          topic: finalTopic, // Use the improved topic mapping
          start_time: webinar.start_time ?? null,
          duration: webinar.duration ?? null,
          timezone: webinar.timezone ?? null,
          agenda: webinar.agenda ?? null,
          host_email: webinar.host_email ?? null,
          status: webinar.status ?? null,
          type: webinar.type ?? null,
          
          // Enhanced timing data (only if enhanced)
          actual_start_time: actualStartTime,
          actual_duration: actualDuration,
          actual_end_time: actualEndTime,
          participants_count: participantsCount,
          
          // Basic URL fields (only if they exist)
          join_url: webinar.join_url ?? null,
          registration_url: webinar.registration_url ?? null,
          start_url: webinar.start_url ?? null,
          password: webinar.password ?? null,
          
          // Basic host info (only if it exists)
          host_id: webinar.host_id ?? null,
          host_name: webinar.host_name ?? null,
          
          // Timestamps
          webinar_created_at: webinar.created_at ?? null,
          
          // FIXED: No assumptions about settings structure
          approval_type: webinar.approval_type ?? null,
          registration_type: webinar.registration_type ?? null,
          auto_recording_type: webinar.auto_recording ?? null,
          
          // FIXED: Safe boolean field handling
          is_simulive: webinar.is_simulive === true,
          enforce_login: webinar.enforce_login === true,
          on_demand: webinar.on_demand === true,
          practice_session: webinar.practice_session === true,
          hd_video: webinar.hd_video === true,
          host_video: webinar.host_video !== false, // Default true
          panelists_video: webinar.panelists_video !== false, // Default true
          
          // Safe string fields with defaults
          audio_type: webinar.audio ?? 'both',
          language: webinar.language ?? 'en-US',
          
          // Metadata and tracking
          raw_data: webinar,
          last_synced_at: currentTimestamp,
          updated_at: currentTimestamp
        };
        
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
            console.log(`[zoom-api][performNonDestructiveUpsert] ✅ New webinar added: ${webinar.id} - "${finalTopic}"`);
          } else {
            // Check if data actually changed to count as an update
            const hasChanges = 
              existingWebinar.topic !== finalTopic ||
              existingWebinar.start_time !== webinar.start_time ||
              existingWebinar.duration !== webinar.duration ||
              existingWebinar.actual_start_time !== actualStartTime ||
              existingWebinar.actual_duration !== actualDuration ||
              existingWebinar.status !== webinar.status;
            
            if (hasChanges) {
              updatedWebinars++;
              console.log(`[zoom-api][performNonDestructiveUpsert] ✅ Webinar updated: ${webinar.id} - "${finalTopic}"`);
              
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
  
  console.log(`[zoom-api][performNonDestructiveUpsert] 🎉 FIXED upsert completed: ${newWebinars} new, ${updatedWebinars} updated, ${preservedWebinars} preserved`);
  
  // Final timing data summary
  const finalTimingCount = webinars.filter(w => w._enhanced_with_past_data === true).length;
  console.log(`[zoom-api][performNonDestructiveUpsert] 📊 Enhanced timing data: ${finalTimingCount}/${webinars.length} webinars`);
  
  return { newWebinars, updatedWebinars, preservedWebinars };
}
