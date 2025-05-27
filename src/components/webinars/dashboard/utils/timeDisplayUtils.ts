
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
 * Get formatted start time display with appropriate label for instances
 */
export function getInstanceStartTimeDisplay(instance: any, timezone: string): StartTimeInfo {
  if (instance.actual_start_time) {
    const actualStart = formatInTimeZone(parseISO(instance.actual_start_time), timezone, 'h:mm a');
    return { label: 'Actual Start:', time: actualStart };
  } else if (instance.start_time) {
    const scheduledStart = formatInTimeZone(parseISO(instance.start_time), timezone, 'h:mm a');
    return { label: 'Scheduled Start:', time: scheduledStart };
  } else {
    return { label: 'Start Time:', time: 'Not available' };
  }
}

/**
 * Get formatted duration display with appropriate label for instances
 */
export function getInstanceDurationDisplay(instance: any): DurationInfo {
  if (instance.actual_duration) {
    return { label: 'Actual Duration:', duration: `${instance.actual_duration} minutes` };
  } else if (instance.duration) {
    return { label: 'Scheduled Duration:', duration: `${instance.duration} minutes` };
  } else {
    return { label: 'Duration:', duration: 'Not specified' };
  }
}

/**
 * Get formatted start time display with appropriate label for webinars (keep existing function)
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
 * Get formatted duration display with appropriate label for webinars (keep existing function)
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
 * Format webinar date in the specified timezone
 */
export function formatWebinarDate(startTime: string | null, timezone: string): string {
  if (!startTime) return 'Date not set';
  return formatInTimeZone(parseISO(startTime), timezone, 'EEEE, MMMM d, yyyy • h:mm a');
}

/**
 * Check if instance has actual timing data
 */
export function hasActualTimingData(instance: any): boolean {
  return !!(instance.actual_start_time || instance.actual_duration);
}

/**
 * Get timing data priority indicator for debugging
 */
export function getTimingDataSource(instance: any): { start: string; duration: string } {
  const startSource = instance.actual_start_time ? 'actual' : (instance.start_time ? 'scheduled' : 'none');
  const durationSource = instance.actual_duration ? 'actual' : (instance.duration ? 'scheduled' : 'none');
  
  return { start: startSource, duration: durationSource };
}
