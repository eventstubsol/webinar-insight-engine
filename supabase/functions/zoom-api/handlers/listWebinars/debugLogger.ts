
/**
 * Debug logging utilities for webinar analysis
 */

export function logCompletionAnalysis(webinars: any[]) {
  console.log(`[debug-logger] 🔍 COMPLETION ANALYSIS FOR ${webinars.length} WEBINARS:`);
  
  const completedWebinars = [];
  const upcomingWebinars = [];
  const unknownWebinars = [];
  
  webinars.forEach(webinar => {
    const now = new Date();
    const startTime = webinar.start_time ? new Date(webinar.start_time) : null;
    const duration = webinar.duration || 60;
    const calculatedEnd = startTime ? new Date(startTime.getTime() + (duration * 60000)) : null;
    
    console.log(`[debug-logger] Webinar ${webinar.id}:`);
    console.log(`[debug-logger]   - Topic: ${webinar.topic}`);
    console.log(`[debug-logger]   - Status: ${webinar.status}`);
    console.log(`[debug-logger]   - Start: ${webinar.start_time}`);
    console.log(`[debug-logger]   - Duration: ${duration} minutes`);
    console.log(`[debug-logger]   - Calculated end: ${calculatedEnd?.toISOString()}`);
    console.log(`[debug-logger]   - Current time: ${now.toISOString()}`);
    
    if (webinar.status === 'ended' || webinar.status === 'aborted') {
      completedWebinars.push(webinar);
      console.log(`[debug-logger]   - ✅ COMPLETED (explicit status)`);
    } else if (calculatedEnd && now > calculatedEnd) {
      completedWebinars.push(webinar);
      console.log(`[debug-logger]   - ✅ COMPLETED (time-based)`);
    } else if (startTime && now < startTime) {
      upcomingWebinars.push(webinar);
      console.log(`[debug-logger]   - 📅 UPCOMING`);
    } else {
      unknownWebinars.push(webinar);
      console.log(`[debug-logger]   - ❓ UNKNOWN STATUS`);
    }
  });
  
  console.log(`[debug-logger] 📊 COMPLETION SUMMARY:`);
  console.log(`[debug-logger]   - Completed: ${completedWebinars.length}`);
  console.log(`[debug-logger]   - Upcoming: ${upcomingWebinars.length}`);
  console.log(`[debug-logger]   - Unknown: ${unknownWebinars.length}`);
  
  return {
    completed: completedWebinars,
    upcoming: upcomingWebinars,
    unknown: unknownWebinars
  };
}

export function logEnhancementResults(webinars: any[]) {
  console.log(`[debug-logger] 🎯 ENHANCEMENT RESULTS:`);
  
  const enhanced = webinars.filter(w => w._enhanced_with_past_data === true);
  const failed = webinars.filter(w => w._enhanced_with_past_data === false && w._past_data_error);
  const skipped = webinars.filter(w => w._enhanced_with_past_data === false && w._skip_reason);
  
  console.log(`[debug-logger]   - Enhanced: ${enhanced.length}`);
  console.log(`[debug-logger]   - Failed: ${failed.length}`);
  console.log(`[debug-logger]   - Skipped: ${skipped.length}`);
  
  enhanced.forEach(w => {
    console.log(`[debug-logger] ✅ Enhanced ${w.id}: actual_start=${w.actual_start_time}, duration=${w.actual_duration}`);
  });
  
  failed.forEach(w => {
    console.log(`[debug-logger] ❌ Failed ${w.id}: ${w._past_data_error}`);
  });
  
  skipped.forEach(w => {
    console.log(`[debug-logger] ⏭️ Skipped ${w.id}: ${w._skip_reason}`);
  });
}
