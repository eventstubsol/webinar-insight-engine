
import { generateMonthlyDateRanges, fetchWebinarsForMonth } from '../../utils/dateUtils.ts';

/**
 * Fetch webinars from Zoom API using 12-month historical approach
 */
export async function fetchWebinarsFromZoomAPI(token: string, userId: string): Promise<any[]> {
  console.log('[zoom-api][fetchWebinarsFromZoomAPI] Starting 12-month historical fetch');
  
  // Generate monthly date ranges for the last 12 months
  const monthlyRanges = generateMonthlyDateRanges(12);
  console.log(`[zoom-api][fetchWebinarsFromZoomAPI] Will fetch webinars for ${monthlyRanges.length} monthly periods`);
  
  // Fetch webinars for each month in parallel with detailed error handling
  const monthlyWebinarPromises = monthlyRanges.map(range => 
    fetchWebinarsForMonth(token, userId, range.from, range.to)
      .catch(error => {
        console.error(`[zoom-api][fetchWebinarsFromZoomAPI] Failed to fetch webinars for ${range.from} to ${range.to}:`, error);
        return []; // Return empty array on error to continue with other months
      })
  );
  
  console.log(`[zoom-api][fetchWebinarsFromZoomAPI] Starting ${monthlyWebinarPromises.length} parallel monthly API requests...`);
  const monthlyResults = await Promise.all(monthlyWebinarPromises);
  
  // Combine and deduplicate webinars from all months
  const allWebinars = [];
  const seenWebinarIds = new Set();
  let monthIndex = 0;
  
  for (const monthWebinars of monthlyResults) {
    const range = monthlyRanges[monthIndex];
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
    monthIndex++;
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
 * Perform non-destructive upsert of webinars into database
 */
export async function performNonDestructiveUpsert(
  supabase: any, 
  userId: string, 
  webinars: any[], 
  existingWebinars: any[]
): Promise<{ newWebinars: number; updatedWebinars: number; preservedWebinars: number }> {
  console.log(`[zoom-api][performNonDestructiveUpsert] Starting non-destructive upsert for ${webinars.length} webinars...`);
  
  let newWebinars = 0;
  let updatedWebinars = 0;
  const currentTimestamp = new Date().toISOString();
  
  for (const webinar of webinars) {
    const webinarData = {
      user_id: userId,
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
    const { error: upsertError } = await supabase
      .from('zoom_webinars')
      .upsert(webinarData, {
        onConflict: 'user_id,webinar_id',
        ignoreDuplicates: false
      });
    
    if (upsertError) {
      console.error(`[zoom-api][performNonDestructiveUpsert] Error upserting webinar ${webinar.id}:`, upsertError);
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
  
  // Calculate preserved webinars (those in DB but not in current API response)
  const apiWebinarIds = new Set(webinars.map(w => w.id.toString()));
  const preservedWebinarsList = existingWebinars?.filter(w => !apiWebinarIds.has(w.webinar_id)) || [];
  const preservedWebinars = preservedWebinarsList.length;
  
  console.log(`[zoom-api][performNonDestructiveUpsert] Upsert completed: ${newWebinars} new, ${updatedWebinars} updated, ${preservedWebinars} preserved`);
  
  return { newWebinars, updatedWebinars, preservedWebinars };
}
