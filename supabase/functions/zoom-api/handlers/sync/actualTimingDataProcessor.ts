
import { enhanceWebinarsWithActualTimingData } from './timingBatchProcessor.ts';

/**
 * Enhance webinars with actual timing data from webinar instances
 * This processor fetches webinar instances for completed webinars to get actual start/end times
 */

/**
 * Enhanced timing processor that combines multiple data sources
 */
export async function enhanceWebinarsWithComprehensiveTimingData(
  webinars: any[], 
  token: string, 
  supabase: any, 
  userId: string
): Promise<any[]> {
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] Processing comprehensive timing data for ${webinars.length} webinars with enhanced timeout protection`);
  
  // Use the new enhanced timing processor
  const enhancedWebinars = await enhanceWebinarsWithActualTimingData(webinars, token, supabase, userId);
  
  const timingStats = {
    total_webinars: enhancedWebinars.length,
    with_actual_timing: enhancedWebinars.filter(w => w.actual_start_time).length,
    enhanced_successfully: enhancedWebinars.filter(w => w._enhanced_with_timing === true).length,
    past_webinars: enhancedWebinars.filter(w => {
      const start = new Date(w.start_time);
      return start < new Date();
    }).length,
    methods: {
      occurrence_past_api: enhancedWebinars.filter(w => w._timing_enhancement_method === 'occurrence_past_api').length,
      uuid_past_api: enhancedWebinars.filter(w => w._timing_enhancement_method === 'uuid_past_api').length,
      instances_api: enhancedWebinars.filter(w => w._timing_enhancement_method === 'instances_api').length
    }
  };
  
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] 🎉 Comprehensive timing enhancement completed!`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] 📊 Timing Statistics:`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - Total webinars: ${timingStats.total_webinars}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - Past webinars: ${timingStats.past_webinars}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - With actual timing: ${timingStats.with_actual_timing}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - Enhancement methods:`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData]   • Occurrence API: ${timingStats.methods.occurrence_past_api}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData]   • UUID API: ${timingStats.methods.uuid_past_api}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData]   • Instances API: ${timingStats.methods.instances_api}`);
  
  return enhancedWebinars;
}
