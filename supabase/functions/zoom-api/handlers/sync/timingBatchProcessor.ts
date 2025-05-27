
import { enhanceSingleWebinarTiming } from './timingEnhancementEngine.ts';

/**
 * Timing Batch Processor - Handles batch processing of webinars for timing enhancement
 */

// Configuration constants
const BATCH_SIZE = 5; // Process 5 webinars at a time
const BATCH_DELAY = 1000; // 1 second delay between batches
const MAX_CONSECUTIVE_FAILURES = 3; // Circuit breaker threshold
const PROCESSING_TIME_LIMIT = 25000; // 25 seconds total limit (leaving 5s buffer)

/**
 * Enhance webinars with actual timing data by fetching and syncing webinar instances
 * Now with batch processing and circuit breaker logic
 */
export async function enhanceWebinarsWithActualTimingData(
  webinars: any[], 
  token: string, 
  supabase: any, 
  userId: string
): Promise<any[]> {
  console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Processing actual timing data for ${webinars.length} webinars with timeout protection`);
  
  const startTime = Date.now();
  const enhancedWebinars = [];
  let successfulTimingEnhancements = 0;
  let failedTimingEnhancements = 0;
  let consecutiveFailures = 0;
  let batchNumber = 0;
  
  // Process webinars in batches to prevent timeout
  for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
    batchNumber++;
    const batch = webinars.slice(i, i + BATCH_SIZE);
    
    console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Processing batch ${batchNumber}/${Math.ceil(webinars.length / BATCH_SIZE)} (${batch.length} webinars)`);
    
    // Check if we're approaching time limit
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > PROCESSING_TIME_LIMIT) {
      console.warn(`[zoom-api][enhanceWebinarsWithActualTimingData] ⚠️ Approaching time limit, processing remaining webinars without timing enhancement`);
      
      // Add remaining webinars without timing enhancement
      for (let j = i; j < webinars.length; j++) {
        enhancedWebinars.push({
          ...webinars[j],
          _enhanced_with_timing: false,
          _timing_enhancement_error: 'Skipped due to time limit',
          _timing_enhancement_timestamp: new Date().toISOString()
        });
      }
      break;
    }
    
    // Circuit breaker: stop if too many consecutive failures
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(`[zoom-api][enhanceWebinarsWithActualTimingData] ⚠️ Circuit breaker activated: ${consecutiveFailures} consecutive failures`);
      
      // Add remaining webinars without timing enhancement
      for (let j = i; j < webinars.length; j++) {
        enhancedWebinars.push({
          ...webinars[j],
          _enhanced_with_timing: false,
          _timing_enhancement_error: 'Circuit breaker activated',
          _timing_enhancement_timestamp: new Date().toISOString()
        });
      }
      break;
    }
    
    // Process batch in parallel but with individual timeouts
    const batchPromises = batch.map(webinar => 
      enhanceSingleWebinarTiming(webinar, token, supabase, userId)
    );
    
    try {
      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        enhancedWebinars.push(result);
        
        if (result._enhanced_with_timing === true) {
          successfulTimingEnhancements++;
          consecutiveFailures = 0; // Reset consecutive failures
        } else {
          failedTimingEnhancements++;
          consecutiveFailures++;
        }
      }
      
      // Add delay between batches to prevent overwhelming the API
      if (i + BATCH_SIZE < webinars.length) {
        console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Waiting ${BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
      
    } catch (error) {
      console.error(`[zoom-api][enhanceWebinarsWithActualTimingData] ❌ Error processing batch ${batchNumber}:`, error);
      
      // Add batch webinars with error status
      for (const webinar of batch) {
        enhancedWebinars.push({
          ...webinar,
          _enhanced_with_timing: false,
          _timing_enhancement_error: `Batch processing error: ${error.message}`,
          _timing_enhancement_timestamp: new Date().toISOString()
        });
        failedTimingEnhancements++;
        consecutiveFailures++;
      }
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] 🎉 Timing enhancement completed in ${totalTime}ms: ${successfulTimingEnhancements} successful, ${failedTimingEnhancements} failed`);
  
  return enhancedWebinars;
}
