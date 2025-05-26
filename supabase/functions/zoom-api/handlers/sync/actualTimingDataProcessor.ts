
import { fetchActualTimingData } from '../enhancedTimingDataFetcher.ts';

/**
 * ENHANCED Timing Data Processor with comprehensive Zoom API integration
 * This replaces the previous implementation with robust API calls
 */
export async function enhanceWebinarsWithActualTimingData(
  webinars: any[], 
  token: string
): Promise<any[]> {
  console.log(`[actualTimingDataProcessor] 🎯 ENHANCED PROCESSOR: Starting comprehensive timing data enhancement for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[actualTimingDataProcessor] No webinars to process, returning empty array`);
    return [];
  }
  
  try {
    // Use the new comprehensive timing data fetcher
    const enhancedWebinars = await fetchActualTimingData(webinars, token);
    
    // Validate and log results
    const withTimingData = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration);
    const successRate = Math.round((withTimingData.length / webinars.length) * 100);
    
    console.log(`[actualTimingDataProcessor] 🎉 ENHANCED PROCESSOR COMPLETED:`);
    console.log(`[actualTimingDataProcessor] - Input webinars: ${webinars.length}`);
    console.log(`[actualTimingDataProcessor] - Output webinars: ${enhancedWebinars.length}`);
    console.log(`[actualTimingDataProcessor] - 🎯 WITH TIMING DATA: ${withTimingData.length} webinars (${successRate}%)`);
    
    if (withTimingData.length > 0) {
      console.log(`[actualTimingDataProcessor] ✅ TIMING DATA SAMPLE:`, {
        webinar_id: withTimingData[0].id,
        actual_start_time: withTimingData[0].actual_start_time,
        actual_duration: withTimingData[0].actual_duration,
        participants_count: withTimingData[0].participants_count
      });
    }
    
    return enhancedWebinars;
    
  } catch (error) {
    console.error(`[actualTimingDataProcessor] ❌ CRITICAL ERROR in enhanced timing processor:`, error);
    console.error(`[actualTimingDataProcessor] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
    
    // Return original webinars to prevent total failure
    console.log(`[actualTimingDataProcessor] 🔄 Returning original webinars due to processing error`);
    return webinars;
  }
}
