
/**
 * Fixed webinar completion detection utility with proper date handling
 */

export interface CompletionDetectionResult {
  isCompleted: boolean;
  reason: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  shouldFetchActualData: boolean;
}

/**
 * Determines if a webinar is completed with proper date comparison
 */
export function detectWebinarCompletion(
  webinarData: any,
  instanceData?: any
): CompletionDetectionResult {
  const now = new Date();
  const data = instanceData || webinarData;
  
  console.log(`[completion-detector] Analyzing completion for webinar ${data.id}:`);
  console.log(`[completion-detector]   - status: ${data.status}`);
  console.log(`[completion-detector]   - start_time: ${data.start_time}`);
  console.log(`[completion-detector]   - current UTC time: ${now.toISOString()}`);
  
  // High confidence - explicit status from Zoom
  if (data.status === 'ended' || data.status === 'aborted') {
    console.log(`[completion-detector] ✅ High confidence completion: explicit status '${data.status}'`);
    return {
      isCompleted: true,
      reason: `Explicit status: ${data.status}`,
      confidenceLevel: 'high',
      shouldFetchActualData: true
    };
  }
  
  // Time-based analysis with proper date handling
  if (data.start_time) {
    try {
      // Parse the start time - Zoom uses ISO format
      const startTime = new Date(data.start_time);
      
      // Validate the parsed date
      if (isNaN(startTime.getTime())) {
        console.warn(`[completion-detector] ⚠️ Invalid start_time format: ${data.start_time}`);
        return {
          isCompleted: false,
          reason: `Invalid start_time format: ${data.start_time}`,
          confidenceLevel: 'low',
          shouldFetchActualData: false
        };
      }
      
      const duration = data.duration || webinarData.duration || 60; // Default 60 minutes
      const calculatedEndTime = new Date(startTime.getTime() + (duration * 60000));
      
      // Add buffer time (30 minutes) to account for webinars running over
      const endTimeWithBuffer = new Date(calculatedEndTime.getTime() + (30 * 60000));
      
      console.log(`[completion-detector]   - parsed start: ${startTime.toISOString()}`);
      console.log(`[completion-detector]   - duration: ${duration} minutes`);
      console.log(`[completion-detector]   - calculated end: ${calculatedEndTime.toISOString()}`);
      console.log(`[completion-detector]   - end with buffer: ${endTimeWithBuffer.toISOString()}`);
      console.log(`[completion-detector]   - time since start: ${Math.round((now.getTime() - startTime.getTime()) / 60000)} minutes`);
      
      // CRITICAL FIX: Check if webinar has clearly ended (with buffer)
      if (now > endTimeWithBuffer) {
        const minutesSinceEnd = Math.round((now.getTime() - endTimeWithBuffer.getTime()) / 60000);
        console.log(`[completion-detector] ✅ High confidence completion: ended ${minutesSinceEnd} minutes ago`);
        
        return {
          isCompleted: true,
          reason: `Time-based: webinar ended ${minutesSinceEnd} minutes ago`,
          confidenceLevel: 'high',
          shouldFetchActualData: true
        };
      }
      
      // Check if webinar started but hasn't ended yet
      if (now > startTime && now <= endTimeWithBuffer) {
        const minutesSinceStart = Math.round((now.getTime() - startTime.getTime()) / 60000);
        console.log(`[completion-detector] ⏳ Webinar likely in progress: ${minutesSinceStart} minutes since start`);
        
        return {
          isCompleted: false,
          reason: `Webinar in progress (${minutesSinceStart} minutes since start)`,
          confidenceLevel: 'medium',
          shouldFetchActualData: false
        };
      }
      
      // Future webinar
      if (now < startTime) {
        const minutesUntilStart = Math.round((startTime.getTime() - now.getTime()) / 60000);
        console.log(`[completion-detector] 📅 Future webinar: starts in ${minutesUntilStart} minutes`);
        return {
          isCompleted: false,
          reason: `Future webinar: starts in ${minutesUntilStart} minutes`,
          confidenceLevel: 'high',
          shouldFetchActualData: false
        };
      }
      
    } catch (error) {
      console.error(`[completion-detector] ❌ Error parsing time data:`, error);
      console.error(`[completion-detector]   - start_time value: ${data.start_time}`);
    }
  }
  
  // FALLBACK: Force completion for old webinars (more than 24 hours ago)
  if (webinarData.created_at || webinarData.start_time) {
    try {
      const referenceDate = new Date(webinarData.start_time || webinarData.created_at);
      const hoursAge = (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursAge > 24) {
        console.log(`[completion-detector] ✅ Fallback completion: webinar is ${Math.round(hoursAge)} hours old`);
        return {
          isCompleted: true,
          reason: `Fallback: webinar is ${Math.round(hoursAge)} hours old`,
          confidenceLevel: 'medium',
          shouldFetchActualData: true
        };
      }
    } catch (error) {
      console.warn(`[completion-detector] ⚠️ Error in fallback date parsing:`, error);
    }
  }
  
  // Default to not completed if we can't determine
  console.log(`[completion-detector] ❓ Cannot determine completion status: insufficient data`);
  return {
    isCompleted: false,
    reason: 'Cannot determine completion status from available data',
    confidenceLevel: 'low',
    shouldFetchActualData: false
  };
}

/**
 * Validates UUID format for Zoom API calls
 */
export function isValidZoomUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  
  const cleaned = uuid.trim();
  if (cleaned.length < 10 || cleaned.length > 100) return false;
  
  // Should contain alphanumeric characters, hyphens, and possibly other valid URL characters
  const validPattern = /^[a-zA-Z0-9\-_=+/]+$/;
  return validPattern.test(cleaned);
}
