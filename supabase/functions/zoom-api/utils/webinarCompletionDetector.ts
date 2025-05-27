
/**
 * Centralized webinar completion detection utility
 * Handles proper completion logic for both single and recurring webinars
 */

export interface CompletionDetectionResult {
  isCompleted: boolean;
  reason: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  shouldFetchActualData: boolean;
}

/**
 * Determines if a webinar or instance is completed and should have actual timing data
 */
export function detectWebinarCompletion(
  webinarData: any,
  instanceData?: any
): CompletionDetectionResult {
  const now = new Date();
  const data = instanceData || webinarData;
  
  console.log(`[completion-detector] Analyzing completion for ${data.id || data.uuid}:`);
  console.log(`[completion-detector]   - status: ${data.status}`);
  console.log(`[completion-detector]   - start_time: ${data.start_time}`);
  console.log(`[completion-detector]   - current time: ${now.toISOString()}`);
  
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
  
  // Time-based analysis with proper timezone handling
  if (data.start_time) {
    try {
      // Parse the start time properly
      const startTime = new Date(data.start_time);
      
      // Validate the parsed date
      if (isNaN(startTime.getTime())) {
        console.warn(`[completion-detector] ⚠️ Invalid start_time format: ${data.start_time}`);
        return {
          isCompleted: false,
          reason: 'Invalid start_time format',
          confidenceLevel: 'low',
          shouldFetchActualData: false
        };
      }
      
      const duration = data.duration || webinarData.duration || 60; // Default 60 minutes
      const calculatedEndTime = new Date(startTime.getTime() + (duration * 60000));
      
      // Add buffer time (15 minutes) to account for webinars running over
      const endTimeWithBuffer = new Date(calculatedEndTime.getTime() + (15 * 60000));
      
      console.log(`[completion-detector]   - parsed start: ${startTime.toISOString()}`);
      console.log(`[completion-detector]   - duration: ${duration} minutes`);
      console.log(`[completion-detector]   - calculated end: ${calculatedEndTime.toISOString()}`);
      console.log(`[completion-detector]   - end with buffer: ${endTimeWithBuffer.toISOString()}`);
      
      // Check if webinar has clearly ended (with buffer)
      if (now > endTimeWithBuffer) {
        console.log(`[completion-detector] ✅ Medium confidence completion: time-based analysis`);
        console.log(`[completion-detector]   - webinar ended ${Math.round((now.getTime() - endTimeWithBuffer.getTime()) / 60000)} minutes ago`);
        
        return {
          isCompleted: true,
          reason: `Time-based: webinar ended at ${endTimeWithBuffer.toISOString()}`,
          confidenceLevel: 'medium',
          shouldFetchActualData: true
        };
      }
      
      // Check if webinar started but hasn't ended yet
      if (now > startTime && now <= endTimeWithBuffer) {
        const minutesSinceStart = Math.round((now.getTime() - startTime.getTime()) / 60000);
        console.log(`[completion-detector] ⏳ Webinar in progress: started ${minutesSinceStart} minutes ago`);
        
        // If it's been more than the scheduled duration + 30 minutes, consider it completed
        if (minutesSinceStart > duration + 30) {
          console.log(`[completion-detector] ✅ Likely completed: running way over scheduled duration`);
          return {
            isCompleted: true,
            reason: `Likely completed: running ${minutesSinceStart - duration} minutes over`,
            confidenceLevel: 'medium',
            shouldFetchActualData: true
          };
        }
        
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
          reason: `Future webinar: starts at ${startTime.toISOString()}`,
          confidenceLevel: 'high',
          shouldFetchActualData: false
        };
      }
      
    } catch (error) {
      console.error(`[completion-detector] ❌ Error parsing time data:`, error);
      console.error(`[completion-detector]   - start_time value: ${data.start_time}`);
      console.error(`[completion-detector]   - error details:`, error.message);
    }
  }
  
  // Fallback: Check if webinar is very old (more than 7 days ago based on creation date)
  if (webinarData.created_at || webinarData.webinar_created_at) {
    try {
      const createdAt = new Date(webinarData.created_at || webinarData.webinar_created_at);
      const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceCreation > 7) {
        console.log(`[completion-detector] ✅ Fallback completion: webinar created ${Math.round(daysSinceCreation)} days ago`);
        return {
          isCompleted: true,
          reason: `Fallback: webinar created ${Math.round(daysSinceCreation)} days ago`,
          confidenceLevel: 'low',
          shouldFetchActualData: true
        };
      }
    } catch (error) {
      console.warn(`[completion-detector] ⚠️ Error parsing creation date:`, error);
    }
  }
  
  // Low confidence - no clear indicators
  console.log(`[completion-detector] ❓ Low confidence: insufficient data to determine completion`);
  console.log(`[completion-detector]   - available data: ${Object.keys(data).join(', ')}`);
  
  return {
    isCompleted: false,
    reason: 'Insufficient data to determine completion status',
    confidenceLevel: 'low',
    shouldFetchActualData: false
  };
}

/**
 * Validates UUID format for Zoom API calls
 */
export function isValidZoomUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  
  // Zoom UUIDs can be various formats, but they're typically long strings
  // Basic validation: not empty, reasonable length, contains valid characters
  const cleaned = uuid.trim();
  if (cleaned.length < 10 || cleaned.length > 100) return false;
  
  // Should contain alphanumeric characters, hyphens, and possibly other valid URL characters
  const validPattern = /^[a-zA-Z0-9\-_=+/]+$/;
  return validPattern.test(cleaned);
}

/**
 * Gets the best identifier for past webinar API calls
 */
export function getBestPastWebinarIdentifier(webinarData: any, instanceData?: any): {
  identifier: string | null;
  type: 'webinar_uuid' | 'webinar_id' | 'instance_uuid';
  confidence: 'high' | 'medium' | 'low';
} {
  const data = instanceData || webinarData;
  
  console.log(`[identifier-selector] Finding best identifier:`);
  console.log(`[identifier-selector]   - instance data: ${instanceData ? 'yes' : 'no'}`);
  console.log(`[identifier-selector]   - instance UUID: ${instanceData?.uuid || 'none'}`);
  console.log(`[identifier-selector]   - webinar UUID: ${webinarData.uuid || 'none'}`);
  console.log(`[identifier-selector]   - webinar ID: ${webinarData.id || 'none'}`);
  
  // For instances, prefer instance UUID
  if (instanceData && instanceData.uuid && isValidZoomUUID(instanceData.uuid)) {
    console.log(`[identifier-selector] ✅ Using instance UUID: ${instanceData.uuid}`);
    return {
      identifier: instanceData.uuid,
      type: 'instance_uuid',
      confidence: 'high'
    };
  }
  
  // For webinars, prefer webinar UUID
  if (webinarData.uuid && isValidZoomUUID(webinarData.uuid)) {
    console.log(`[identifier-selector] ✅ Using webinar UUID: ${webinarData.uuid}`);
    return {
      identifier: webinarData.uuid,
      type: 'webinar_uuid',
      confidence: 'high'
    };
  }
  
  // Fallback to webinar ID
  if (webinarData.id && isValidZoomUUID(webinarData.id)) {
    console.log(`[identifier-selector] ⚠️ Using webinar ID as fallback: ${webinarData.id}`);
    return {
      identifier: webinarData.id,
      type: 'webinar_id',
      confidence: 'medium'
    };
  }
  
  console.log(`[identifier-selector] ❌ No valid identifier found`);
  return {
    identifier: null,
    type: 'webinar_id',
    confidence: 'low'
  };
}
