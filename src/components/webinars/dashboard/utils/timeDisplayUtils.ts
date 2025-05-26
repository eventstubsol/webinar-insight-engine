
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';

export interface StartTimeInfo {
  label: string;
  time: string;
  isDataMissing?: boolean;
}

export interface DurationInfo {
  label: string;
  duration: string;
  isDataMissing?: boolean;
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
    // Check if this is an ended webinar that should have actual timing data
    const isEndedWebinar = webinar.status === 'ended' || webinar.status === 'aborted';
    return { 
      label: 'Scheduled Start:', 
      time: scheduledStart,
      isDataMissing: isEndedWebinar
    };
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
  
  // Check if this is an ended webinar that should have actual timing data but doesn't
  const isEndedWebinar = webinar.status === 'ended' || webinar.status === 'aborted';
  if (isEndedWebinar) {
    return { 
      label: 'Actual Start:', 
      time: 'Data unavailable (try syncing)', 
      isDataMissing: true 
    };
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
    const scheduledDuration = `${webinar.duration} minutes`;
    // Check if this is an ended webinar that should have actual timing data
    const isEndedWebinar = webinar.status === 'ended' || webinar.status === 'aborted';
    return { 
      label: 'Scheduled Duration:', 
      duration: scheduledDuration,
      isDataMissing: isEndedWebinar
    };
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
  
  // Check if this is an ended webinar that should have actual timing data but doesn't
  const isEndedWebinar = webinar.status === 'ended' || webinar.status === 'aborted';
  if (isEndedWebinar) {
    return { 
      label: 'Actual Duration:', 
      duration: 'Data unavailable (try syncing)', 
      isDataMissing: true 
    };
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
