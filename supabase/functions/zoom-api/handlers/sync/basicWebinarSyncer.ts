
/**
 * NEW: Basic webinar syncer that only handles data from /users/{userId}/webinars
 * Separates concerns and only maps fields that actually exist in the basic API response
 */

/**
 * Syncs basic webinar data from /users/{userId}/webinars endpoint
 * Only maps fields that are guaranteed to exist in the basic webinar response
 */
export async function syncBasicWebinarData(webinars: any[], token: string, userId: string) {
  console.log(`[basic-webinar-syncer] 🔄 Processing ${webinars.length} basic webinars`);
  
  const processedWebinars = webinars.map(webinar => {
    // Only map fields that exist in the basic /users/{userId}/webinars response
    const basicWebinar = {
      // Core identifiers
      id: webinar.id,
      uuid: webinar.uuid,
      
      // Basic information (guaranteed fields)
      topic: webinar.topic || 'Untitled Webinar',
      start_time: webinar.start_time,
      duration: webinar.duration,
      timezone: webinar.timezone,
      type: webinar.type,
      status: webinar.status,
      
      // Host information (if available in basic response)
      host_id: webinar.host_id,
      host_email: webinar.host_email,
      
      // URLs (if available)
      join_url: webinar.join_url,
      start_url: webinar.start_url,
      registration_url: webinar.registration_url,
      
      // Basic settings (only if they exist in basic response)
      agenda: webinar.agenda,
      password: webinar.password,
      
      // Creation timestamp
      created_at: webinar.created_at,
      
      // Store the raw response for debugging
      raw_data: webinar,
      
      // Mark data source for clarity
      _data_source: 'basic_webinar_api',
      _synced_at: new Date().toISOString()
    };
    
    console.log(`[basic-webinar-syncer] 📊 Processed basic webinar: ${basicWebinar.topic} (${basicWebinar.id})`);
    console.log(`[basic-webinar-syncer]   - start_time: ${basicWebinar.start_time}`);
    console.log(`[basic-webinar-syncer]   - status: ${basicWebinar.status}`);
    console.log(`[basic-webinar-syncer]   - type: ${basicWebinar.type}`);
    
    return basicWebinar;
  });
  
  console.log(`[basic-webinar-syncer] ✅ Processed ${processedWebinars.length} basic webinars`);
  return processedWebinars;
}

/**
 * Enhances basic webinars with actual timing data from past_webinars API
 * This is a separate step that only runs for completed webinars
 */
export async function enhanceWithPastWebinarData(basicWebinars: any[], token: string) {
  console.log(`[past-webinar-enhancer] 🔄 Enhancing ${basicWebinars.length} webinars with actual timing data`);
  
  const enhancedWebinars = [];
  
  for (const webinar of basicWebinars) {
    try {
      // Import the fixed completion detector
      const { detectWebinarCompletion } = await import('../utils/webinarCompletionDetector.ts');
      const { fetchPastWebinarData } = await import('../utils/pastWebinarApiClient.ts');
      
      // Check if webinar is completed using fixed detector
      const completionResult = detectWebinarCompletion(webinar);
      
      // Only try to fetch past data for completed webinars
      if (completionResult.shouldFetchActualData) {
        console.log(`[past-webinar-enhancer] 🎯 Fetching past data for completed webinar: ${webinar.id}`);
        
        const pastDataResult = await fetchPastWebinarData(token, webinar, null, completionResult);
        
        if (pastDataResult.success) {
          // Enhance with actual timing data
          const enhancedWebinar = {
            ...webinar,
            actual_start_time: pastDataResult.actualStartTime,
            actual_duration: pastDataResult.actualDuration,
            actual_end_time: pastDataResult.actualEndTime,
            participants_count: pastDataResult.participantsCount,
            _enhanced_with_past_data: true,
            _past_data_source: 'past_webinar_api',
            _past_data_calls: pastDataResult.apiCallsMade,
            _completion_analysis: completionResult
          };
          
          console.log(`[past-webinar-enhancer] ✅ Enhanced webinar ${webinar.id} with actual timing data`);
          enhancedWebinars.push(enhancedWebinar);
        } else {
          console.log(`[past-webinar-enhancer] ⚠️ Could not get past data for ${webinar.id}: ${pastDataResult.error}`);
          enhancedWebinars.push({
            ...webinar,
            _enhanced_with_past_data: false,
            _past_data_error: pastDataResult.error,
            _completion_analysis: completionResult
          });
        }
      } else {
        console.log(`[past-webinar-enhancer] ⏭️ Skipping past data for ${webinar.id}: ${completionResult.reason}`);
        enhancedWebinars.push({
          ...webinar,
          _enhanced_with_past_data: false,
          _skip_reason: completionResult.reason,
          _completion_analysis: completionResult
        });
      }
    } catch (error) {
      console.error(`[past-webinar-enhancer] ❌ Error enhancing webinar ${webinar.id}:`, error);
      enhancedWebinars.push({
        ...webinar,
        _enhanced_with_past_data: false,
        _enhancement_error: error.message
      });
    }
  }
  
  const successCount = enhancedWebinars.filter(w => w._enhanced_with_past_data).length;
  console.log(`[past-webinar-enhancer] ✅ Enhanced ${successCount}/${basicWebinars.length} webinars with past data`);
  
  return enhancedWebinars;
}
