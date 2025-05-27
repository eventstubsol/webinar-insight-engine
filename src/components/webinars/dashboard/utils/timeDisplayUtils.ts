
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
 * Note: Minimal sync returns scheduled times only for performance
 */
export function getStartTimeDisplay(webinar: any, timezone: string): StartTimeInfo {
  // In minimal sync mode, we only have scheduled times
  if (webinar._minimal_sync || !webinar.actual_start_time) {
    if (webinar.start_time) {
      const scheduledStart = formatInTimeZone(parseISO(webinar.start_time), timezone, 'h:mm a');
      return { label: 'Scheduled Start:', time: scheduledStart };
    } else {
      return { label: 'Start Time:', time: 'Not available' };
    }
  }
  
  // Legacy handling for enhanced webinars (rarely used now)
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
 * Note: Minimal sync returns scheduled duration only for performance
 */
export function getDurationDisplay(webinar: any): DurationInfo {
  // In minimal sync mode, we only have scheduled duration
  if (webinar._minimal_sync || !webinar.actual_duration) {
    if (webinar.duration) {
      return { label: 'Scheduled Duration:', duration: `${webinar.duration} minutes` };
    } else {
      return { label: 'Duration:', duration: 'Not specified' };
    }
  }
  
  // Legacy handling for enhanced webinars (rarely used now)
  if (webinar.actual_duration) {
    return { label: 'Actual Duration:', duration: `${webinar.actual_duration} minutes` };
  } else if (webinar.duration) {
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
