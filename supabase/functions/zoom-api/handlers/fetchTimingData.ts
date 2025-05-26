
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { fetchSingleWebinarTimingData } from './enhancedTimingDataFetcher.ts';
import { syncWebinarMetadata } from './sync/webinarMetadataSyncer.ts';

export async function handleFetchTimingData(req: Request, supabase: any, user: any, credentials: any, webinar_id: string, webinar_uuid?: string) {
  console.log(`[fetchTimingData] 🎯 ENHANCED: Starting timing data fetch for webinar: ${webinar_id}`);
  console.log(`[fetchTimingData] UUID provided: ${webinar_uuid || 'none'}`);
  console.log(`[fetchTimingData] User: ${user?.id}`);
  
  if (!webinar_id) {
    console.error(`[fetchTimingData] ❌ No webinar ID provided`);
    return new Response(JSON.stringify({ error: 'Webinar ID is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Get Zoom token
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    console.log(`[fetchTimingData] ✅ Got Zoom token successfully`);
    
    // Fetch timing data using the enhanced fetcher
    console.log(`[fetchTimingData] 🔍 Calling enhanced timing data fetcher...`);
    const timingData = await fetchSingleWebinarTimingData(webinar_id, webinar_uuid, token);
    
    console.log(`[fetchTimingData] 📊 Enhanced timing data received:`, timingData);
    
    // If we have timing data, update the database
    if (timingData.actual_start_time || timingData.actual_duration) {
      console.log(`[fetchTimingData] 💾 Updating database with timing data...`);
      
      // First, get the existing webinar data
      const { data: existingWebinar, error: fetchError } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id)
        .eq('webinar_id', webinar_id)
        .single();
      
      if (fetchError) {
        console.error(`[fetchTimingData] ❌ Error fetching existing webinar:`, fetchError);
        throw new Error(`Failed to fetch existing webinar: ${fetchError.message}`);
      }
      
      if (!existingWebinar) {
        console.error(`[fetchTimingData] ❌ Webinar not found in database`);
        throw new Error(`Webinar ${webinar_id} not found in database`);
      }
      
      // Create updated webinar data with timing information
      const updatedWebinarData = {
        ...existingWebinar.raw_data,
        id: webinar_id,
        webinar_id: webinar_id,
        uuid: webinar_uuid || existingWebinar.webinar_uuid,
        topic: existingWebinar.topic,
        status: existingWebinar.status,
        // Add the timing data
        actual_start_time: timingData.actual_start_time,
        actual_duration: timingData.actual_duration,
        actual_end_time: timingData.actual_end_time,
        participants_count: timingData.participants_count
      };
      
      console.log(`[fetchTimingData] 🔄 Calling syncWebinarMetadata with enhanced timing data...`);
      
      // Update the webinar with timing data
      const syncResult = await syncWebinarMetadata(
        supabase,
        user,
        updatedWebinarData,
        existingWebinar.host_email,
        existingWebinar.host_id,
        existingWebinar.host_name,
        existingWebinar.host_first_name,
        existingWebinar.host_last_name
      );
      
      if (syncResult.error) {
        console.error(`[fetchTimingData] ❌ Error updating webinar with timing data:`, syncResult.error);
        throw new Error(`Failed to update webinar: ${syncResult.error.message}`);
      }
      
      console.log(`[fetchTimingData] ✅ Successfully updated webinar with timing data`);
      
      // Verify the update worked
      const { data: updatedWebinar, error: verifyError } = await supabase
        .from('zoom_webinars')
        .select('actual_start_time, actual_duration, participants_count, last_synced_at')
        .eq('user_id', user.id)
        .eq('webinar_id', webinar_id)
        .single();
      
      if (verifyError) {
        console.warn(`[fetchTimingData] ⚠️ Error verifying update:`, verifyError);
      } else {
        console.log(`[fetchTimingData] 🔍 Verification - Database now contains:`, updatedWebinar);
      }
      
      return new Response(JSON.stringify({
        success: true,
        webinar_id: webinar_id,
        timing_data: timingData,
        database_updated: true,
        verification: updatedWebinar
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } else {
      console.log(`[fetchTimingData] ⚠️ No timing data found for webinar ${webinar_id}`);
      
      return new Response(JSON.stringify({
        success: true,
        webinar_id: webinar_id,
        timing_data: null,
        database_updated: false,
        message: 'No timing data available for this webinar'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error(`[fetchTimingData] ❌ CRITICAL ERROR:`, error);
    console.error(`[fetchTimingData] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      webinar_id: webinar_id,
      timing_data: null,
      database_updated: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
