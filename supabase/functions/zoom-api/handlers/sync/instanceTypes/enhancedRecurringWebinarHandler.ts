
import { fetchComprehensivePastWebinarData } from '../../../utils/enhancedPastWebinarClient.ts';
import { mapWebinarToInstanceData } from '../../../utils/enhancedInstanceDataMapper.ts';

/**
 * Enhanced handler for recurring webinar instances with comprehensive data population
 */
export async function handleEnhancedRecurringWebinarInstances(webinar: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[enhanced-recurring-handler] 📡 Fetching instances for recurring webinar ${webinar.id} (${webinar.topic})`);
  console.log(`[enhanced-recurring-handler] 📊 Using ENHANCED data extraction for complete field population`);
  
  try {
    // Step 1: Fetch all instances for this recurring webinar
    const instancesUrl = `https://api.zoom.us/v2/webinars/${webinar.id}/instances`;
    console.log(`[enhanced-recurring-handler] 📡 Calling: ${instancesUrl}`);
    
    const response = await fetch(instancesUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.warn(`[enhanced-recurring-handler] ⚠️ Failed to fetch instances: ${response.status} - ${errorData.message}`);
      return 0;
    }
    
    const data = await response.json();
    const instances = data.instances || [];
    
    console.log(`[enhanced-recurring-handler] 📊 Found ${instances.length} instances for recurring webinar ${webinar.id}`);
    
    if (instances.length === 0) {
      console.log(`[enhanced-recurring-handler] ℹ️ No instances found for webinar ${webinar.id}`);
      return 0;
    }
    
    let instancesProcessed = 0;
    
    // Step 2: Process EACH instance with enhanced data extraction
    for (const instance of instances) {
      try {
        console.log(`[enhanced-recurring-handler] 🔄 Processing instance ${instance.uuid || instance.instance_id} of ${instances.length}`);
        const processedCount = await processEnhancedRecurringInstance(webinar, instance, token, supabase, userId);
        instancesProcessed += processedCount;
      } catch (error) {
        console.error(`[enhanced-recurring-handler] ❌ Error processing instance ${instance.uuid}:`, error);
        // Continue with other instances even if one fails
      }
    }
    
    console.log(`[enhanced-recurring-handler] ✅ Successfully processed ${instancesProcessed}/${instances.length} instances for webinar ${webinar.id}`);
    return instancesProcessed;
    
  } catch (error) {
    console.error(`[enhanced-recurring-handler] ❌ Error fetching instances for recurring webinar ${webinar.id}:`, error);
    return 0;
  }
}

/**
 * Process a single instance of a recurring webinar with enhanced data extraction
 */
async function processEnhancedRecurringInstance(webinar: any, instance: any, token: string, supabase: any, userId: string): Promise<number> {
  const instanceId = instance.uuid || instance.instance_id || 'unknown';
  console.log(`[enhanced-recurring-handler] 🔍 Processing instance ${instanceId}, status: ${instance.status}`);
  
  // Step 1: Fetch enhanced webinar data from main API
  const webinarApiResult = await fetchWebinarData(token, webinar.id);
  const enhancedWebinarData = webinarApiResult.success ? webinarApiResult.data : webinar;
  
  // Step 2: Determine if this instance is completed
  const isCompleted = isInstanceCompleted(instance);
  console.log(`[enhanced-recurring-handler] 📊 Instance completion status: ${isCompleted}`);
  
  // Step 3: Fetch comprehensive past webinar data if instance appears completed
  let pastDataResult = null;
  if (isCompleted) {
    console.log(`[enhanced-recurring-handler] 🔄 Fetching past webinar data for completed instance`);
    pastDataResult = await fetchComprehensivePastWebinarData(token, enhancedWebinarData, instance);
    console.log(`[enhanced-recurring-handler] 📊 Past data fetch result: success=${pastDataResult?.success || false}`);
  }
  
  // Step 4: Map all data to enhanced instance structure
  const instanceData = mapWebinarToInstanceData(
    enhancedWebinarData,
    instance,
    pastDataResult?.pastData || null,
    userId
  );
  
  console.log(`[enhanced-recurring-handler] 📊 ENHANCED MAPPED DATA for instance ${instanceId}:`);
  console.log(`[enhanced-recurring-handler]   ✅ webinar_id: ${instanceData.webinar_id}`);
  console.log(`[enhanced-recurring-handler]   ✅ instance_id: ${instanceData.instance_id}`);
  console.log(`[enhanced-recurring-handler]   ✅ topic: ${instanceData.topic}`);
  console.log(`[enhanced-recurring-handler]   ✅ start_time: ${instanceData.start_time}`);
  console.log(`[enhanced-recurring-handler]   ✅ end_time: ${instanceData.end_time}`);
  console.log(`[enhanced-recurring-handler]   ✅ duration: ${instanceData.duration}`);
  console.log(`[enhanced-recurring-handler]   ✅ actual_start_time: ${instanceData.actual_start_time}`);
  console.log(`[enhanced-recurring-handler]   ✅ actual_duration: ${instanceData.actual_duration}`);
  console.log(`[enhanced-recurring-handler]   ✅ status: ${instanceData.status}`);
  console.log(`[enhanced-recurring-handler]   ✅ participants_count: ${instanceData.participants_count}`);
  console.log(`[enhanced-recurring-handler]   ✅ registrants_count: ${instanceData.registrants_count}`);
  console.log(`[enhanced-recurring-handler]   ✅ is_historical: ${instanceData.is_historical}`);
  console.log(`[enhanced-recurring-handler]   ✅ data_source: ${instanceData.data_source}`);
  
  // Step 5: Upsert to database with enhanced data
  const { upsertEnhancedInstanceRecord } = await import('../databaseOperations/enhancedInstanceUpsert.ts');
  return await upsertEnhancedInstanceRecord(supabase, instanceData);
}

/**
 * Fetch detailed webinar data from the main webinars API
 */
async function fetchWebinarData(token: string, webinarId: string) {
  console.log(`[enhanced-recurring-handler] 📡 Fetching detailed webinar data for ${webinarId}`);
  
  try {
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[enhanced-recurring-handler] ✅ Successfully fetched webinar data`);
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.warn(`[enhanced-recurring-handler] ⚠️ Webinar API failed: ${response.status} - ${errorText}`);
      return { success: false, data: null };
    }
  } catch (error) {
    console.error(`[enhanced-recurring-handler] ❌ Error fetching webinar data:`, error);
    return { success: false, data: null };
  }
}

/**
 * Determine if instance is completed based on various indicators
 */
function isInstanceCompleted(instance: any): boolean {
  // Check explicit status
  if (instance.status === 'ended' || instance.status === 'aborted' || instance.status === 'finished') {
    return true;
  }
  
  // Check if start time is in the past and we have duration
  if (instance.start_time && instance.duration) {
    try {
      const startTime = new Date(instance.start_time);
      const endTime = new Date(startTime.getTime() + (instance.duration * 60000));
      const now = new Date();
      
      if (now > endTime) {
        return true;
      }
    } catch (error) {
      console.warn(`[enhanced-recurring-handler] ⚠️ Error checking completion by time:`, error);
    }
  }
  
  return false;
}
