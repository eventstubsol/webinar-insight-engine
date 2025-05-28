
import { WebinarFieldMapping } from '../../utils/enhancedFieldMapper.ts';

/**
 * FIXED: Fetch webinars from Zoom API using correct endpoints
 */
export async function fetchWebinarsFromZoomAPI(token: string, userId: string): Promise<any[]> {
  console.log(`[non-destructive-sync] 📡 Fetching webinars from Zoom API for user: ${userId}`);
  console.log(`[non-destructive-sync] 📋 Using correct Zoom API endpoints per documentation`);
  
  const allWebinars: any[] = [];
  
  // Fetch upcoming webinars
  try {
    const upcomingUrl = `https://api.zoom.us/v2/users/${userId}/webinars?page_size=300`;
    console.log(`[non-destructive-sync] 📡 Fetching upcoming webinars: ${upcomingUrl}`);
    
    const upcomingResponse = await fetch(upcomingUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (upcomingResponse.ok) {
      const upcomingData = await upcomingResponse.json();
      console.log(`[non-destructive-sync] ✅ Upcoming webinars fetched: ${upcomingData.webinars?.length || 0}`);
      
      if (upcomingData.webinars?.length > 0) {
        const upcoming = upcomingData.webinars.map(w => ({
          ...w,
          _data_source: 'standard_api',
          _is_historical: false
        }));
        allWebinars.push(...upcoming);
      }
    } else {
      const errorText = await upcomingResponse.text();
      console.error(`[non-destructive-sync] ❌ Upcoming API error: ${upcomingResponse.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('[non-destructive-sync] ❌ Error fetching upcoming webinars:', error);
  }
  
  // Fetch historical webinars
  try {
    const fromDate = '2023-01-01';
    const toDate = new Date().toISOString().split('T')[0];
    const historicalUrl = `https://api.zoom.us/v2/report/users/${userId}/webinars?from=${fromDate}&to=${toDate}&page_size=300`;
    console.log(`[non-destructive-sync] 📡 Fetching historical webinars: ${historicalUrl}`);
    
    const historicalResponse = await fetch(historicalUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (historicalResponse.ok) {
      const historicalData = await historicalResponse.json();
      console.log(`[non-destructive-sync] ✅ Historical webinars fetched: ${historicalData.webinars?.length || 0}`);
      
      if (historicalData.webinars?.length > 0) {
        const historical = historicalData.webinars.map(w => ({
          ...w,
          _data_source: 'reporting_api',
          _is_historical: true
        }));
        allWebinars.push(...historical);
      }
    } else {
      const errorText = await historicalResponse.text();
      console.error(`[non-destructive-sync] ❌ Historical API error: ${historicalResponse.status} - ${errorText}`);
      
      if (historicalResponse.status === 403) {
        console.warn('[non-destructive-sync] ⚠️ Missing reporting scope - continuing without historical data');
      }
    }
  } catch (error) {
    console.error('[non-destructive-sync] ❌ Error fetching historical webinars:', error);
  }
  
  console.log(`[non-destructive-sync] 📊 Total webinars fetched from Zoom API: ${allWebinars.length}`);
  return allWebinars;
}

/**
 * FIXED: Perform non-destructive upsert with proper error handling
 */
export async function performNonDestructiveUpsert(
  supabase: any,
  userId: string,
  webinars: WebinarFieldMapping[],
  existingWebinars: any[]
): Promise<{ newWebinars: number; updatedWebinars: number; preservedWebinars: number }> {
  console.log(`[non-destructive-sync] 💾 Starting non-destructive upsert for ${webinars.length} webinars`);
  
  let newWebinars = 0;
  let updatedWebinars = 0;
  let preservedWebinars = existingWebinars.length;
  
  for (const webinar of webinars) {
    try {
      // Prepare webinar data for database
      const webinarData = {
        user_id: userId,
        webinar_id: webinar.id,
        webinar_uuid: webinar.uuid || '',
        topic: webinar.topic || 'Untitled Webinar',
        start_time: webinar.start_time,
        end_time: webinar.end_time,
        duration: webinar.duration,
        actual_duration: webinar.actual_duration,
        status: webinar.status || 'available',
        host_email: webinar.host_email,
        host_id: webinar.host_id,
        timezone: webinar.timezone,
        agenda: webinar.agenda,
        join_url: webinar.join_url,
        registration_url: webinar.registration_url,
        data_source: webinar.data_source || 'standard_api',
        is_historical: webinar.is_historical || false,
        raw_data: webinar.raw_data || webinar,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        type: webinar.type || 5,
        registrants_count: webinar.registrants_count || 0,
        participants_count: webinar.participants_count || 0
      };
      
      console.log(`[non-destructive-sync] 💾 Upserting webinar: ${webinar.id} - "${webinar.topic}"`);
      
      const { error: upsertError } = await supabase
        .from('zoom_webinars')
        .upsert(webinarData, {
          onConflict: 'user_id,webinar_id',
          ignoreDuplicates: false
        });
      
      if (upsertError) {
        console.error(`[non-destructive-sync] ❌ Error upserting webinar ${webinar.id}:`, upsertError);
      } else {
        // Check if this was a new webinar or update
        const existingWebinar = existingWebinars.find(ew => ew.webinar_id === webinar.id);
        if (existingWebinar) {
          updatedWebinars++;
          console.log(`[non-destructive-sync] ✅ Updated existing webinar: ${webinar.id}`);
        } else {
          newWebinars++;
          console.log(`[non-destructive-sync] ✅ Inserted new webinar: ${webinar.id}`);
        }
      }
    } catch (error) {
      console.error(`[non-destructive-sync] ❌ Error processing webinar ${webinar.id}:`, error);
    }
  }
  
  console.log(`[non-destructive-sync] 💾 Upsert completed: ${newWebinars} new, ${updatedWebinars} updated, ${preservedWebinars} preserved`);
  
  return {
    newWebinars,
    updatedWebinars,
    preservedWebinars
  };
}
