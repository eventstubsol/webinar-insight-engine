
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
  
  console.log(`[completion-detector] Analyzing completion for ${data.id || data.uuid}: status=${data.status}, start_time=${data.start_time}`);
  
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
  
  // Medium confidence - time-based analysis with proper timezone handling
  if (data.start_time) {
    try {
      const startTime = new Date(data.start_time);
      const duration = data.duration || webinarData.duration || 60; // Default 60 minutes if no duration
      const calculatedEndTime = new Date(startTime.getTime() + (duration * 60000));
      
      // Add buffer time (10 minutes) to account for webinars running over
      const endTimeWithBuffer = new Date(calculatedEndTime.getTime() + (10 * 60000));
      
      if (now > endTimeWithBuffer) {
        console.log(`[completion-detector] ✅ Medium confidence completion: time-based analysis`);
        console.log(`[completion-detector]   - start: ${startTime.toISOString()}`);
        console.log(`[completion-detector]   - calculated end (with buffer): ${endTimeWithBuffer.toISOString()}`);
        console.log(`[completion-detector]   - current time: ${now.toISOString()}`);
        
        return {
          isCompleted: true,
          reason: `Time-based: webinar ended at ${endTimeWithBuffer.toISOString()}`,
          confidenceLevel: 'medium',
          shouldFetchActualData: true
        };
      }
      
      // Check if webinar started but not yet ended
      if (now > startTime && now <= endTimeWithBuffer) {
        console.log(`[completion-detector] ⏳ Webinar in progress or recently ended`);
        return {
          isCompleted: false,
          reason: `Webinar in progress or recently ended`,
          confidenceLevel: 'medium',
          shouldFetchActualData: false
        };
      }
      
      // Future webinar
      if (now < startTime) {
        console.log(`[completion-detector] 📅 Future webinar`);
        return {
          isCompleted: false,
          reason: `Future webinar: starts at ${startTime.toISOString()}`,
          confidenceLevel: 'high',
          shouldFetchActualData: false
        };
      }
    } catch (error) {
      console.warn(`[completion-detector] ⚠️ Error parsing time data:`, error);
    }
  }
  
  // Low confidence - no clear indicators
  console.log(`[completion-detector] ❓ Low confidence: insufficient data to determine completion`);
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
  
  // For instances, prefer instance UUID
  if (instanceData && instanceData.uuid && isValidZoomUUID(instanceData.uuid)) {
    return {
      identifier: instanceData.uuid,
      type: 'instance_uuid',
      confidence: 'high'
    };
  }
  
  // For webinars, prefer webinar UUID
  if (webinarData.uuid && isValidZoomUUID(webinarData.uuid)) {
    return {
      identifier: webinarData.uuid,
      type: 'webinar_uuid',
      confidence: 'high'
    };
  }
  
  // Fallback to webinar ID
  if (webinarData.id && isValidZoomUUID(webinarData.id)) {
    return {
      identifier: webinarData.id,
      type: 'webinar_id',
      confidence: 'medium'
    };
  }
  
  return {
    identifier: null,
    type: 'webinar_id',
    confidence: 'low'
  };
}
