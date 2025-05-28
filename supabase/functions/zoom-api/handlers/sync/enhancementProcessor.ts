/**
 * FIXED: Simplified enhancement processor with proper data source separation
 * Each enhancement type is handled separately to avoid confusion
 */

interface EnhancementResult {
  enhanced: any[];
  successCount: number;
  errorCount: number;
  processingTime: number;
}

/**
 * Process basic webinars with past webinar data enhancement (focused operation)
 */
export async function enhanceWithPastWebinarData(
  basicWebinars: any[], 
  token: string
): Promise<EnhancementResult> {
  const startTime = Date.now();
  console.log(`[enhancement-processor] 🔄 FIXED: Starting focused past webinar enhancement for ${basicWebinars.length} webinars`);
  
  const enhanced = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const webinar of basicWebinars) {
    try {
      // Import completion detector
      const { detectWebinarCompletion } = await import('../utils/webinarCompletionDetector.ts');
      
      // Check completion status
      const completionResult = detectWebinarCompletion(webinar);
      console.log(`[enhancement-processor] Webinar ${webinar.id}: ${completionResult.reason}`);
      
      if (completionResult.shouldFetchActualData) {
        console.log(`[enhancement-processor] 🎯 Fetching past data for completed webinar: ${webinar.id}`);
        
        // Import past webinar client
        const { fetchPastWebinarData } = await import('../utils/pastWebinarApiClient.ts');
        
        // Fetch actual timing data
        const pastDataResult = await fetchPastWebinarData(token, webinar, null, completionResult);
        
        if (pastDataResult.success && pastDataResult.actualData) {
          // Enhance with actual timing data
          const enhancedWebinar = {
            ...webinar,
            actual_start_time: pastDataResult.actualStartTime,
            actual_duration: pastDataResult.actualDuration,
            actual_end_time: pastDataResult.actualEndTime,
            participants_count: pastDataResult.participantsCount,
            _enhanced_with_past_data: true,
            _past_data_source: 'past_webinar_api',
            _completion_analysis: completionResult,
            _api_calls_made: pastDataResult.apiCallsMade
          };
          
          enhanced.push(enhancedWebinar);
          successCount++;
          
          console.log(`[enhancement-processor] ✅ Enhanced ${webinar.id} with actual timing data`);
          console.log(`[enhancement-processor]   - actual_start_time: ${pastDataResult.actualStartTime}`);
          console.log(`[enhancement-processor]   - actual_duration: ${pastDataResult.actualDuration}`);
        } else {
          console.log(`[enhancement-processor] ⚠️ Could not get past data for ${webinar.id}: ${pastDataResult.error}`);
          enhanced.push({
            ...webinar,
            _enhanced_with_past_data: false,
            _past_data_error: pastDataResult.error,
            _completion_analysis: completionResult
          });
          errorCount++;
        }
      } else {
        console.log(`[enhancement-processor] ⏭️ Skipping past data for ${webinar.id}: ${completionResult.reason}`);
        enhanced.push({
          ...webinar,
          _enhanced_with_past_data: false,
          _skip_reason: completionResult.reason,
          _completion_analysis: completionResult
        });
      }
    } catch (error) {
      console.error(`[enhancement-processor] ❌ Error enhancing webinar ${webinar.id}:`, error);
      enhanced.push({
        ...webinar,
        _enhanced_with_past_data: false,
        _enhancement_error: error.message
      });
      errorCount++;
    }
  }
  
  const processingTime = Date.now() - startTime;
  console.log(`[enhancement-processor] ✅ FIXED enhancement completed: ${successCount} enhanced, ${errorCount} errors, ${processingTime}ms`);
  
  return {
    enhanced,
    successCount,
    errorCount,
    processingTime
  };
}

/**
 * Process webinars with instance data (separate operation)
 */
export async function enhanceWithInstanceData(
  webinars: any[], 
  token: string
): Promise<EnhancementResult> {
  const startTime = Date.now();
  console.log(`[enhancement-processor] 🔄 Starting instance data enhancement for ${webinars.length} webinars`);
  
  // This would be implemented separately to handle recurring webinar instances
  // For now, return webinars unchanged as this is a separate concern
  
  const processingTime = Date.now() - startTime;
  return {
    enhanced: webinars,
    successCount: 0,
    errorCount: 0,
    processingTime
  };
}

/**
 * Process webinars with participant data (separate operation)  
 */
export async function enhanceWithParticipantData(
  webinars: any[], 
  token: string
): Promise<EnhancementResult> {
  const startTime = Date.now();
  console.log(`[enhancement-processor] 🔄 Starting participant data enhancement for ${webinars.length} webinars`);
  
  // This would be implemented separately to handle participant counts
  // For now, return webinars unchanged as this is a separate concern
  
  const processingTime = Date.now() - startTime;
  return {
    enhanced: webinars,
    successCount: 0,
    errorCount: 0,
    processingTime
  };
}
