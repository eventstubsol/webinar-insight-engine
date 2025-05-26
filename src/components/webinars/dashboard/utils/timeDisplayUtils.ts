
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';

export interface StartTimeInfo {
  label: string;
  time: string;
}

export interface DurationInfo {
  label: string;
  duration: string;
}

/**
 * Get formatted start time display with appropriate label
 */
export function getStartTimeDisplay(webinar: any, timezone: string): StartTimeInfo {
  if (webinar.actual_start_time) {
    const actualStart = formatInTimeZone(parseISO(webinar.actual_start_time), timezone, 'h:mm a');
    return { label: 'Actual Start:', time: actualStart };
  } else if (webinar.start_time) {
    const scheduledStart = formatInTimeZone(parseISO(webinar.start_time), timezone, 'h:mm a');
    return { label: 'Scheduled Start:', time: scheduledStart };
  } else {
    return { label: 'Start Time:', time: 'Not available' };
  }
}

/**
 * Get formatted duration display with appropriate label
 */
export function getDurationDisplay(webinar: any): DurationInfo {
  if (webinar.actual_duration) {
    return { label: 'Actual Duration:', duration: `${webinar.actual_duration} minutes` };
  } else if (webinar.duration) {
    return { label: 'Scheduled Duration:', duration: `${webinar.duration} minutes` };
  } else {
    return { label: 'Duration:', duration: 'Not specified' };
  }
}

/**
 * Get formatted scheduled start time display
 */
export function getScheduledStartTimeDisplay(webinar: any, timezone: string): StartTimeInfo {
  if (webinar.start_time) {
    const scheduledStart = formatInTimeZone(parseISO(webinar.start_time), timezone, 'h:mm a');
    return { label: 'Scheduled Start:', time: scheduledStart };
  } else {
    return { label: 'Scheduled Start:', time: 'Not set' };
  }
}

/**
 * Get formatted actual start time display - checks both direct field and raw_data
 */
export function getActualStartTimeDisplay(webinar: any, timezone: string): StartTimeInfo | null {
  // Check direct field first
  let actualStartTime = webinar.actual_start_time;
  
  // If not found, check in raw_data
  if (!actualStartTime && webinar.raw_data) {
    actualStartTime = webinar.raw_data.actual_start_time || 
                     webinar.raw_data.start_time_actual ||
                     webinar.raw_data.actualStartTime;
  }
  
  if (actualStartTime) {
    const actualStart = formatInTimeZone(parseISO(actualStartTime), timezone, 'h:mm a');
    return { label: 'Actual Start:', time: actualStart };
  }
  return null;
}

/**
 * Get formatted scheduled duration display
 */
export function getScheduledDurationDisplay(webinar: any): DurationInfo {
  if (webinar.duration) {
    return { label: 'Scheduled Duration:', duration: `${webinar.duration} minutes` };
  } else {
    return { label: 'Scheduled Duration:', duration: 'Not specified' };
  }
}

/**
 * Get formatted actual duration display - checks both direct field and raw_data
 */
export function getActualDurationDisplay(webinar: any): DurationInfo | null {
  // Check direct field first
  let actualDuration = webinar.actual_duration;
  
  // If not found, check in raw_data
  if (!actualDuration && webinar.raw_data) {
    actualDuration = webinar.raw_data.actual_duration || 
                    webinar.raw_data.duration_actual ||
                    webinar.raw_data.actualDuration;
  }
  
  if (actualDuration) {
    return { label: 'Actual Duration:', duration: `${actualDuration} minutes` };
  }
  return null;
}

/**
 * Format webinar date in the specified timezone
 */
export function formatWebinarDate(startTime: string | null, timezone: string): string {
  if (!startTime) return 'Date not set';
  return formatInTimeZone(parseISO(startTime), timezone, 'EEEE, MMMM d, yyyy • h:mm a');
}
