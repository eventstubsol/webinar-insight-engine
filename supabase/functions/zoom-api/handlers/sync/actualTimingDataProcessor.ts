
/**
 * Enhanced processor for extracting and aggregating actual timing data from webinar instances
 */
export async function enhanceWebinarsWithComprehensiveTimingData(webinars: any[], token: string, supabase: any, userId: string) {
  console.log(`[zoom-api][timing-processor] 🕒 Starting COMPREHENSIVE timing data enhancement for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][timing-processor] No webinars to process for timing data`);
    return webinars;
  }
  
  // Process webinars in smaller batches to avoid timeouts
  const BATCH_SIZE = 10;
  const enhancedWebinars = [];
  
  for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
    const batch = webinars.slice(i, i + BATCH_SIZE);
    console.log(`[zoom-api][timing-processor] Processing timing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(webinars.length/BATCH_SIZE)} (${batch.length} webinars)`);
    
    const batchPromises = batch.map(async (webinar) => {
      try {
        console.log(`[zoom-api][timing-processor] 🎯 Processing timing for webinar: ${webinar.id} (${webinar.topic})`);
        
        // Step 1: Try to get actual timing from instances in our database
        const { data: instances, error: instancesError } = await supabase
          .from('zoom_webinar_instances')
          .select('*')
          .eq('user_id', userId)
          .eq('webinar_id', webinar.id);
        
        if (instancesError) {
          console.error(`[zoom-api][timing-processor] Error fetching instances for webinar ${webinar.id}:`, instancesError);
        } else if (instances && instances.length > 0) {
          console.log(`[zoom-api][timing-processor] 📊 Found ${instances.length} instances for webinar ${webinar.id}`);
          
          // Filter instances that have actual duration data
          const instancesWithDuration = instances.filter(instance => instance.duration !== null && instance.duration > 0);
          console.log(`[zoom-api][timing-processor] 📈 ${instancesWithDuration.length} instances have duration data`);
          
          if (instancesWithDuration.length > 0) {
            // Calculate total actual duration by summing all instance durations
            const totalActualDuration = instancesWithDuration.reduce((sum, instance) => {
              console.log(`[zoom-api][timing-processor]   - Instance ${instance.instance_id}: ${instance.duration} minutes`);
              return sum + (instance.duration || 0);
            }, 0);
            
            // Get the earliest start time and latest end time from instances
            let earliestStart = null;
            let latestEnd = null;
            
            instancesWithDuration.forEach(instance => {
              if (instance.start_time) {
                if (!earliestStart || new Date(instance.start_time) < new Date(earliestStart)) {
                  earliestStart = instance.start_time;
                }
              }
              if (instance.end_time) {
                if (!latestEnd || new Date(instance.end_time) > new Date(latestEnd)) {
                  latestEnd = instance.end_time;
                }
              }
            });
            
            // Enhance webinar with actual timing data
            webinar.actual_duration = totalActualDuration;
            webinar.actual_start_time = earliestStart;
            webinar.actual_end_time = latestEnd;
            webinar._enhanced_with_timing = true;
            webinar._timing_source = 'instances';
            webinar._instances_used = instancesWithDuration.length;
            webinar._total_instances = instances.length;
            
            console.log(`[zoom-api][timing-processor] ✅ Enhanced webinar ${webinar.id} with instance timing:`);
            console.log(`[zoom-api][timing-processor]   - Total actual duration: ${totalActualDuration} minutes (from ${instancesWithDuration.length} instances)`);
            console.log(`[zoom-api][timing-processor]   - Actual start time: ${earliestStart}`);
            console.log(`[zoom-api][timing-processor]   - Actual end time: ${latestEnd}`);
            
            return webinar;
          } else {
            console.log(`[zoom-api][timing-processor] ⚠️ No instances with duration data found for webinar ${webinar.id}`);
          }
        } else {
          console.log(`[zoom-api][timing-processor] 📭 No instances found in database for webinar ${webinar.id}`);
        }
        
        // Step 2: If no instances or no duration data, try past webinar API for completed webinars
        if (webinar.status === 'ended' || webinar.status === 'aborted') {
          console.log(`[zoom-api][timing-processor] 🔍 Trying past webinar API for completed webinar ${webinar.id}`);
          
          try {
            const pastWebinarResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (pastWebinarResponse.ok) {
              const pastWebinarData = await pastWebinarResponse.json();
              
              if (pastWebinarData.duration && pastWebinarData.duration > 0) {
                webinar.actual_duration = pastWebinarData.duration;
                webinar.actual_start_time = pastWebinarData.start_time || webinar.start_time;
                webinar.actual_end_time = pastWebinarData.end_time || null;
                webinar._enhanced_with_past_api = true;
                webinar._timing_source = 'past_api';
                
                console.log(`[zoom-api][timing-processor] ✅ Enhanced webinar ${webinar.id} with past API timing:`);
                console.log(`[zoom-api][timing-processor]   - Actual duration: ${pastWebinarData.duration} minutes`);
                console.log(`[zoom-api][timing-processor]   - Actual start time: ${pastWebinarData.start_time}`);
                
                return webinar;
              } else {
                console.log(`[zoom-api][timing-processor] ⚠️ Past API returned no duration for webinar ${webinar.id}`);
              }
            } else {
              console.log(`[zoom-api][timing-processor] ⚠️ Past API request failed for webinar ${webinar.id}: ${pastWebinarResponse.status}`);
            }
          } catch (pastApiError) {
            console.warn(`[zoom-api][timing-processor] Error calling past webinar API for ${webinar.id}:`, pastApiError);
          }
        }
        
        // Step 3: If still no actual timing data, use scheduled data as fallback
        console.log(`[zoom-api][timing-processor] 📋 Using scheduled timing as fallback for webinar ${webinar.id}`);
        webinar._timing_source = 'scheduled';
        webinar._enhanced_with_timing = false;
        
        return webinar;
        
      } catch (error) {
        console.error(`[zoom-api][timing-processor] Error processing timing for webinar ${webinar.id}:`, error);
        webinar._timing_enhancement_error = error.message;
        webinar._enhanced_with_timing = false;
        return webinar;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    enhancedWebinars.push(...batchResults);
  }
  
  // Calculate enhancement statistics
  const withActualTiming = enhancedWebinars.filter(w => w.actual_duration && w.actual_duration > 0);
  const fromInstances = enhancedWebinars.filter(w => w._timing_source === 'instances');
  const fromPastApi = enhancedWebinars.filter(w => w._timing_source === 'past_api');
  const scheduledOnly = enhancedWebinars.filter(w => w._timing_source === 'scheduled');
  
  console.log(`[zoom-api][timing-processor] 🎉 TIMING ENHANCEMENT COMPLETED!`);
  console.log(`[zoom-api][timing-processor] ═══════════════════════════════════════`);
  console.log(`[zoom-api][timing-processor] 📊 TIMING ENHANCEMENT SUMMARY:`);
  console.log(`[zoom-api][timing-processor]   • Total webinars processed: ${enhancedWebinars.length}`);
  console.log(`[zoom-api][timing-processor]   • With actual timing data: ${withActualTiming.length} (${Math.round((withActualTiming.length/enhancedWebinars.length)*100)}%)`);
  console.log(`[zoom-api][timing-processor]   • Enhanced from instances: ${fromInstances.length}`);
  console.log(`[zoom-api][timing-processor]   • Enhanced from past API: ${fromPastApi.length}`);
  console.log(`[zoom-api][timing-processor]   • Using scheduled data: ${scheduledOnly.length}`);
  console.log(`[zoom-api][timing-processor] ═══════════════════════════════════════`);
  
  return enhancedWebinars;
}
