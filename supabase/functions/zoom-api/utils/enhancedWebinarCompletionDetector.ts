
/**
 * Enhanced webinar completion detection with improved accuracy
 */

export interface EnhancedCompletionDetectionResult {
  isCompleted: boolean;
  reason: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  shouldFetchActualData: boolean;
  apiStrategy: 'past_webinar_id' | 'past_webinar_uuid' | 'instances_then_past' | 'none';
  bestIdentifier: string | null;
}

/**
 * Enhanced completion detection with better logic for determining completed webinars
 */
export function detectEnhancedWebinarCompletion(
  webinarData: any,
  instanceData?: any
): EnhancedCompletionDetectionResult {
  const now = new Date();
  const data = instanceData || webinarData;
  
  console.log(`[enhanced-completion-detector] 🔍 Analyzing completion for webinar ${data.id}:`);
  console.log(`[enhanced-completion-detector]   - status: ${data.status}`);
  console.log(`[enhanced-completion-detector]   - start_time: ${data.start_time}`);
  console.log(`[enhanced-completion-detector]   - type: ${webinarData.type}`);
  console.log(`[enhanced-completion-detector]   - current UTC time: ${now.toISOString()}`);
  
  // Strategy 1: Explicit completion status from Zoom
  if (data.status === 'ended' || data.status === 'aborted') {
    const bestId = getBestIdentifierForAPI(webinarData, instanceData);
    console.log(`[enhanced-completion-detector] ✅ High confidence: explicit status '${data.status}'`);
    
    return {
      isCompleted: true,
      reason: `Explicit completion status: ${data.status}`,
      confidenceLevel: 'high',
      shouldFetchActualData: true,
      apiStrategy: bestId.strategy,
      bestIdentifier: bestId.identifier
    };
  }
  
  // Strategy 2: Time-based analysis with improved logic
  if (data.start_time) {
    try {
      const startTime = new Date(data.start_time);
      
      if (isNaN(startTime.getTime())) {
        console.warn(`[enhanced-completion-detector] ⚠️ Invalid start_time: ${data.start_time}`);
        return {
          isCompleted: false,
          reason: `Invalid start_time format: ${data.start_time}`,
          confidenceLevel: 'low',
          shouldFetchActualData: false,
          apiStrategy: 'none',
          bestIdentifier: null
        };
      }
      
      const duration = data.duration || webinarData.duration || 60;
      const calculatedEndTime = new Date(startTime.getTime() + (duration * 60000));
      
      // Enhanced buffer logic: 15 minutes for short webinars, 30 for longer ones
      const bufferMinutes = duration <= 30 ? 15 : 30;
      const endTimeWithBuffer = new Date(calculatedEndTime.getTime() + (bufferMinutes * 60000));
      
      const minutesSinceStart = Math.round((now.getTime() - startTime.getTime()) / 60000);
      const minutesSinceScheduledEnd = Math.round((now.getTime() - calculatedEndTime.getTime()) / 60000);
      const minutesSinceBufferedEnd = Math.round((now.getTime() - endTimeWithBuffer.getTime()) / 60000);
      
      console.log(`[enhanced-completion-detector]   - parsed start: ${startTime.toISOString()}`);
      console.log(`[enhanced-completion-detector]   - duration: ${duration} minutes`);
      console.log(`[enhanced-completion-detector]   - calculated end: ${calculatedEndTime.toISOString()}`);
      console.log(`[enhanced-completion-detector]   - end with buffer: ${endTimeWithBuffer.toISOString()}`);
      console.log(`[enhanced-completion-detector]   - minutes since start: ${minutesSinceStart}`);
      console.log(`[enhanced-completion-detector]   - minutes since scheduled end: ${minutesSinceScheduledEnd}`);
      console.log(`[enhanced-completion-detector]   - minutes since buffered end: ${minutesSinceBufferedEnd}`);
      
      // High confidence: Well past the buffered end time
      if (now > endTimeWithBuffer && minutesSinceBufferedEnd > 10) {
        const bestId = getBestIdentifierForAPI(webinarData, instanceData);
        console.log(`[enhanced-completion-detector] ✅ High confidence: ended ${minutesSinceBufferedEnd} minutes ago`);
        
        return {
          isCompleted: true,
          reason: `Time-based: webinar ended ${minutesSinceBufferedEnd} minutes ago (with buffer)`,
          confidenceLevel: 'high',
          shouldFetchActualData: true,
          apiStrategy: bestId.strategy,
          bestIdentifier: bestId.identifier
        };
      }
      
      // Medium confidence: Past scheduled end but within buffer
      if (now > calculatedEndTime && now <= endTimeWithBuffer) {
        console.log(`[enhanced-completion-detector] 🤔 Medium confidence: in buffer period`);
        
        return {
          isCompleted: false,
          reason: `In buffer period: ${minutesSinceScheduledEnd} minutes past scheduled end`,
          confidenceLevel: 'medium',
          shouldFetchActualData: false,
          apiStrategy: 'none',
          bestIdentifier: null
        };
      }
      
      // Webinar in progress
      if (now > startTime && now <= calculatedEndTime) {
        console.log(`[enhanced-completion-detector] ⏳ Webinar in progress: ${minutesSinceStart} minutes since start`);
        
        return {
          isCompleted: false,
          reason: `In progress: ${minutesSinceStart} minutes since start`,
          confidenceLevel: 'high',
          shouldFetchActualData: false,
          apiStrategy: 'none',
          bestIdentifier: null
        };
      }
      
      // Future webinar
      if (now < startTime) {
        const minutesUntilStart = Math.round((startTime.getTime() - now.getTime()) / 60000);
        console.log(`[enhanced-completion-detector] 📅 Future webinar: starts in ${minutesUntilStart} minutes`);
        
        return {
          isCompleted: false,
          reason: `Future webinar: starts in ${minutesUntilStart} minutes`,
          confidenceLevel: 'high',
          shouldFetchActualData: false,
          apiStrategy: 'none',
          bestIdentifier: null
        };
      }
      
    } catch (error) {
      console.error(`[enhanced-completion-detector] ❌ Error parsing time data:`, error);
    }
  }
  
  // Strategy 3: Age-based fallback for old webinars
  const ageBasedResult = checkWebinarAge(webinarData, instanceData);
  if (ageBasedResult.shouldConsiderCompleted) {
    const bestId = getBestIdentifierForAPI(webinarData, instanceData);
    console.log(`[enhanced-completion-detector] 🔄 Age-based completion: ${ageBasedResult.reason}`);
    
    return {
      isCompleted: true,
      reason: ageBasedResult.reason,
      confidenceLevel: 'medium',
      shouldFetchActualData: true,
      apiStrategy: bestId.strategy,
      bestIdentifier: bestId.identifier
    };
  }
  
  // Default: Cannot determine
  console.log(`[enhanced-completion-detector] ❓ Cannot determine completion status`);
  return {
    isCompleted: false,
    reason: 'Insufficient data to determine completion status',
    confidenceLevel: 'low',
    shouldFetchActualData: false,
    apiStrategy: 'none',
    bestIdentifier: null
  };
}

/**
 * Determines the best identifier and API strategy for fetching past webinar data
 */
function getBestIdentifierForAPI(webinarData: any, instanceData?: any): { strategy: string; identifier: string | null } {
  // For recurring webinars with instance data, prefer instance UUID
  if (instanceData && instanceData.uuid && (webinarData.type === 6 || webinarData.type === 9)) {
    return {
      strategy: 'past_webinar_uuid',
      identifier: instanceData.uuid
    };
  }
  
  // For single webinars, prefer webinar UUID
  if (webinarData.uuid && webinarData.type === 5) {
    return {
      strategy: 'past_webinar_uuid',
      identifier: webinarData.uuid
    };
  }
  
  // Fallback to webinar ID
  if (webinarData.id) {
    return {
      strategy: 'past_webinar_id',
      identifier: webinarData.id
    };
  }
  
  return {
    strategy: 'none',
    identifier: null
  };
}

/**
 * Check if webinar should be considered completed based on age
 */
function checkWebinarAge(webinarData: any, instanceData?: any): { shouldConsiderCompleted: boolean; reason: string } {
  const now = new Date();
  const data = instanceData || webinarData;
  
  // Check creation date
  if (webinarData.created_at) {
    try {
      const createdDate = new Date(webinarData.created_at);
      const hoursAge = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursAge > 48) {
        return {
          shouldConsiderCompleted: true,
          reason: `Webinar created ${Math.round(hoursAge)} hours ago`
        };
      }
    } catch (error) {
      console.warn(`[age-check] Error parsing created_at: ${error.message}`);
    }
  }
  
  // Check start time age
  if (data.start_time) {
    try {
      const startDate = new Date(data.start_time);
      const hoursAge = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursAge > 24) {
        return {
          shouldConsiderCompleted: true,
          reason: `Start time was ${Math.round(hoursAge)} hours ago`
        };
      }
    } catch (error) {
      console.warn(`[age-check] Error parsing start_time: ${error.message}`);
    }
  }
  
  return {
    shouldConsiderCompleted: false,
    reason: 'Webinar is not old enough to assume completion'
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
