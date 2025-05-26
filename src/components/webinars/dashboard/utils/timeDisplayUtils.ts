
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';

export interface StartTimeInfo {
  label: string;
  time: string;
  isActual: boolean;
}

export interface DurationInfo {
  label: string;
  duration: string;
  isActual: boolean;
}

/**
 * Get formatted start time display with appropriate label
 */
export function getStartTimeDisplay(webinar: any, timezone: string): StartTimeInfo {
  if (webinar.actual_start_time) {
    const actualStart = formatInTimeZone(parseISO(webinar.actual_start_time), timezone, 'h:mm a');
    return { label: 'Actual Start Time:', time: actualStart, isActual: true };
  } else if (webinar.start_time) {
    const scheduledStart = formatInTimeZone(parseISO(webinar.start_time), timezone, 'h:mm a');
    
    // For ended webinars, show "Start Time" since we don't have actual data
    // For upcoming webinars, show "Scheduled Start Time"
    const label = webinar.status === 'ended' ? 'Start Time:' : 'Scheduled Start Time:';
    return { label, time: scheduledStart, isActual: false };
  } else {
    return { label: 'Start Time:', time: 'Not available', isActual: false };
  }
}

/**
 * Get formatted duration display with appropriate label
 */
export function getDurationDisplay(webinar: any): DurationInfo {
  if (webinar.actual_duration) {
    return { label: 'Actual Duration:', duration: `${webinar.actual_duration} minutes`, isActual: true };
  } else if (webinar.duration) {
    // For ended webinars, show "Duration" since we don't have actual data
    // For upcoming webinars, show "Scheduled Duration"
    const label = webinar.status === 'ended' ? 'Duration:' : 'Scheduled Duration:';
    return { label, duration: `${webinar.duration} minutes`, isActual: false };
  } else {
    return { label: 'Duration:', duration: 'Not specified', isActual: false };
  }
}

/**
 * Format webinar date in the specified timezone
 */
export function formatWebinarDate(startTime: string | null, timezone: string): string {
  if (!startTime) return 'Date not set';
  return formatInTimeZone(parseISO(startTime), timezone, 'EEEE, MMMM d, yyyy • h:mm a');
}
