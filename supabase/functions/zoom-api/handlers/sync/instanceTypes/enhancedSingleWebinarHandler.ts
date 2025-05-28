
import { fetchComprehensivePastWebinarData } from '../../../utils/enhancedPastWebinarClient.ts';
import { mapWebinarToInstanceData } from '../../../utils/enhancedInstanceDataMapper.ts';

/**
 * Enhanced handler for single-occurrence webinars with comprehensive data population
 */
export async function handleEnhancedSingleOccurrenceWebinar(webinar: any, token: string, supabase: any, userId: string): Promise<number> {
  
  console.log(`[enhanced-single-handler] 🎯 Processing single webinar ${webinar.id} (${webinar.topic})`);
  console.log(`[enhanced-single-handler] 📊 Using ENHANCED data extraction for complete field population`);
  
  // Step 1: Fetch comprehensive webinar data from main API
  const webinarApiResult = await fetchWebinarData(token, webinar.id);
  const enhancedWebinarData = webinarApiResult.success ? webinarApiResult.data : webinar;
  
  // Step 2: Fetch comprehensive past webinar data if webinar appears completed
  const isCompleted = isWebinarCompleted(enhancedWebinarData);
  console.log(`[enhanced-single-handler] 📊 Webinar completion status: ${isCompleted}`);
  
  let pastDataResult = null;
  if (isCompleted) {
    console.log(`[enhanced-single-handler] 🔄 Fetching past webinar data for completed webinar`);
    pastDataResult = await fetchComprehensivePastWebinarData(token, enhancedWebinarData);
    console.log(`[enhanced-single-handler] 📊 Past data fetch result: success=${pastDataResult.success}`);
  }
  
  // Step 3: Map all data to enhanced instance structure
  const instanceData = mapWebinarToInstanceData(
    enhancedWebinarData,
    null, // No separate instance for single occurrence
    pastDataResult?.pastData || null,
    userId
  );
  
  console.log(`[enhanced-single-handler] 📊 ENHANCED MAPPED DATA:`);
  console.log(`[enhanced-single-handler]   ✅ webinar_id: ${instanceData.webinar_id}`);
  console.log(`[enhanced-single-handler]   ✅ instance_id: ${instanceData.instance_id}`);
  console.log(`[enhanced-single-handler]   ✅ topic: ${instanceData.topic}`);
  console.log(`[enhanced-single-handler]   ✅ start_time: ${instanceData.start_time}`);
  console.log(`[enhanced-single-handler]   ✅ end_time: ${instanceData.end_time}`);
  console.log(`[enhanced-single-handler]   ✅ duration: ${instanceData.duration}`);
  console.log(`[enhanced-single-handler]   ✅ actual_start_time: ${instanceData.actual_start_time}`);
  console.log(`[enhanced-single-handler]   ✅ actual_duration: ${instanceData.actual_duration}`);
  console.log(`[enhanced-single-handler]   ✅ status: ${instanceData.status}`);
  console.log(`[enhanced-single-handler]   ✅ participants_count: ${instanceData.participants_count}`);
  console.log(`[enhanced-single-handler]   ✅ registrants_count: ${instanceData.registrants_count}`);
  console.log(`[enhanced-single-handler]   ✅ is_historical: ${instanceData.is_historical}`);
  console.log(`[enhanced-single-handler]   ✅ data_source: ${instanceData.data_source}`);
  
  // Step 4: Upsert to database with enhanced data
  const { upsertEnhancedInstanceRecord } = await import('../databaseOperations/enhancedInstanceUpsert.ts');
  const result = await upsertEnhancedInstanceRecord(supabase, instanceData);
  
  console.log(`[enhanced-single-handler] 🎯 Enhanced single webinar ${webinar.id} processed: ${result} instance created with complete data`);
  return result;
}

/**
 * Fetch detailed webinar data from the main webinars API
 */
async function fetchWebinarData(token: string, webinarId: string) {
  console.log(`[enhanced-single-handler] 📡 Fetching detailed webinar data for ${webinarId}`);
  
  try {
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[enhanced-single-handler] ✅ Successfully fetched webinar data`);
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.warn(`[enhanced-single-handler] ⚠️ Webinar API failed: ${response.status} - ${errorText}`);
      return { success: false, data: null };
    }
  } catch (error) {
    console.error(`[enhanced-single-handler] ❌ Error fetching webinar data:`, error);
    return { success: false, data: null };
  }
}

/**
 * Determine if webinar is completed based on various indicators
 */
function isWebinarCompleted(webinar: any): boolean {
  // Check explicit status
  if (webinar.status === 'ended' || webinar.status === 'aborted' || webinar.status === 'finished') {
    return true;
  }
  
  // Check if start time is in the past and we have duration
  if (webinar.start_time && webinar.duration) {
    try {
      const startTime = new Date(webinar.start_time);
      const endTime = new Date(startTime.getTime() + (webinar.duration * 60000));
      const now = new Date();
      
      if (now > endTime) {
        return true;
      }
    } catch (error) {
      console.warn(`[enhanced-single-handler] ⚠️ Error checking completion by time:`, error);
    }
  }
  
  return false;
}
