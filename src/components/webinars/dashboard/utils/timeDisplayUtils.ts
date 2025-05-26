
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
 * Get formatted scheduled start time display
 */
export function getScheduledTimeDisplay(webinar: any, timezone: string): StartTimeInfo | null {
  if (webinar.start_time) {
    const scheduledStart = formatInTimeZone(parseISO(webinar.start_time), timezone, 'h:mm a');
    return { label: 'Scheduled Start:', time: scheduledStart };
  }
  return null;
}

/**
 * Get formatted actual start time display
 */
export function getActualTimeDisplay(webinar: any, timezone: string): StartTimeInfo | null {
  if (webinar.actual_start_time) {
    const actualStart = formatInTimeZone(parseISO(webinar.actual_start_time), timezone, 'h:mm a');
    return { label: 'Actual Start:', time: actualStart };
  }
  return null;
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
 * Get formatted scheduled duration display
 */
export function getScheduledDurationDisplay(webinar: any): DurationInfo | null {
  if (webinar.duration) {
    return { label: 'Scheduled Duration:', duration: `${webinar.duration} minutes` };
  }
  return null;
}

/**
 * Get formatted actual duration display
 */
export function getActualDurationDisplay(webinar: any): DurationInfo | null {
  if (webinar.actual_duration) {
    return { label: 'Actual Duration:', duration: `${webinar.actual_duration} minutes` };
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
