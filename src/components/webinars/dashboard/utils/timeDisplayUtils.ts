
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
 * Note: Actual timing data temporarily disabled to fix 500 errors
 */
export function getStartTimeDisplay(webinar: any, timezone: string): StartTimeInfo {
  if (webinar.actual_start_time) {
    const actualStart = formatInTimeZone(parseISO(webinar.actual_start_time), timezone, 'h:mm a');
    return { label: 'Actual Start:', time: actualStart };
  } else if (webinar.start_time) {
    const scheduledStart = formatInTimeZone(parseISO(webinar.start_time), timezone, 'h:mm a');
    // Show scheduled time since actual timing data is temporarily disabled
    return { label: 'Scheduled Start:', time: scheduledStart };
  } else {
    return { label: 'Start Time:', time: 'Not available' };
  }
}

/**
 * Get formatted duration display with appropriate label
 * Note: Actual timing data temporarily disabled to fix 500 errors
 */
export function getDurationDisplay(webinar: any): DurationInfo {
  if (webinar.actual_duration) {
    return { label: 'Actual Duration:', duration: `${webinar.actual_duration} minutes` };
  } else if (webinar.duration) {
    // Show scheduled duration since actual timing data is temporarily disabled
    return { label: 'Scheduled Duration:', duration: `${webinar.duration} minutes` };
  } else {
    return { label: 'Duration:', duration: 'Not specified' };
  }
}

/**
 * Format webinar date in the specified timezone
 */
export function formatWebinarDate(startTime: string | null, timezone: string): string {
  if (!startTime) return 'Date not set';
  return formatInTimeZone(parseISO(startTime), timezone, 'EEEE, MMMM d, yyyy • h:mm a');
}
