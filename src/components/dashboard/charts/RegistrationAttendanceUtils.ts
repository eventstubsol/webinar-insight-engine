
import { format, parseISO, subMonths, startOfMonth, isAfter, isBefore, addMinutes } from 'date-fns';
import { ZoomWebinar } from '@/hooks/zoom';

// Types for chart data
export interface MonthlyAttendanceData {
  month: string;
  monthDate: Date;
  registrants: number;
  attendees: number;
}

/**
 * Calculate webinar statistics aggregated by month for the last 12 months
 */
export const calculateWebinarStats = (webinars: ZoomWebinar[] | undefined, isLoading: boolean, debug: boolean = false): MonthlyAttendanceData[] => {
  if (!webinars || isLoading) return [];
  
  // Get 12 months ago from now
  const twelveMonthsAgo = subMonths(new Date(), 12);
  const startDate = startOfMonth(twelveMonthsAgo);
  
  // Filter webinars that have already ended (either status is 'ended' or the start_time + duration is in the past)
  const now = new Date();
  const completedWebinars = webinars.filter(webinar => {
    const startTime = webinar.start_time ? new Date(webinar.start_time) : null;
    
    if (!startTime) return false;
    
    // Include webinars with 'ended' status
    if (webinar.status === 'ended') return true;
    
    // Include webinars that happened in the past (start_time + duration has passed)
    const endTime = addMinutes(startTime, webinar.duration || 0);
    return endTime < now;
  });
  
  // Log filtered webinars if debug mode is on
  if (debug) {
    console.log('Complete webinars for chart:', completedWebinars);
  }
  
  // Create a map of months with their aggregated data
  const monthlyData = new Map();
  
  // Initialize the map with the last 12 months
  for (let i = 0; i < 12; i++) {
    const month = subMonths(new Date(), i);
    const monthKey = format(month, 'MMMyy');
    const monthDate = startOfMonth(month); // Store the actual date object for proper sorting
    
    monthlyData.set(monthKey, { 
      month: monthKey,
      monthDate: monthDate, // Store the actual date object
      registrants: 0, 
      attendees: 0
    });
  }
  
  // Add data from webinars
  completedWebinars.forEach(webinar => {
    // Skip if no start_time
    if (!webinar.start_time) return;
    
    const webinarDate = new Date(webinar.start_time);
    
    // Skip if the webinar is older than 12 months
    if (isBefore(webinarDate, startDate)) return;
    
    const monthKey = format(webinarDate, 'MMMyy');
    
    // If this month isn't in our map (should not happen given initialization), skip
    if (!monthlyData.has(monthKey)) return;
    
    const currentData = monthlyData.get(monthKey);
    
    // Get registrant and participant counts with enhanced fallback sources
    let registrantsCount = 0;
    let attendeesCount = 0;
    
    // Primary source: direct properties on the webinar object
    if (webinar.registrants_count !== undefined && webinar.registrants_count > 0) {
      registrantsCount = webinar.registrants_count;
    }
    
    if (webinar.participants_count !== undefined && webinar.participants_count > 0) {
      attendeesCount = webinar.participants_count;
    }
    
    // Secondary source: raw_data object
    if (registrantsCount === 0 && webinar.raw_data && typeof webinar.raw_data === 'object') {
      // Try various ways to access the raw_data
      const rawData = typeof webinar.raw_data === 'string' ? JSON.parse(webinar.raw_data) : webinar.raw_data;
      registrantsCount = rawData.registrants_count || rawData.detailed_data?.registrants_count || 0;
    }
    
    if (attendeesCount === 0 && webinar.raw_data && typeof webinar.raw_data === 'object') {
      const rawData = typeof webinar.raw_data === 'string' ? JSON.parse(webinar.raw_data) : webinar.raw_data;
      attendeesCount = rawData.participants_count || rawData.detailed_data?.participants_count || 0;
    }
    
    // Log for debugging
    if (debug && (registrantsCount > 0 || attendeesCount > 0)) {
      console.log(`Webinar ${webinar.topic}: registrants=${registrantsCount}, attendees=${attendeesCount}`);
    }
    
    // Update the month data
    monthlyData.set(monthKey, {
      ...currentData,
      registrants: currentData.registrants + registrantsCount,
      attendees: currentData.attendees + attendeesCount
    });
  });
  
  // Convert map to array and sort by date using the stored date object
  const result = Array.from(monthlyData.values())
    .sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime());
    
  if (debug) {
    console.log('Monthly attendance data:', result);
  }
  
  return result;
};

/**
 * Calculate total registrants from the webinar stats
 */
export const calculateTotalRegistrants = (webinarStats: MonthlyAttendanceData[]): number => {
  return webinarStats.reduce((total, item) => total + item.registrants, 0);
};

/**
 * Calculate total attendees from the webinar stats
 */
export const calculateTotalAttendees = (webinarStats: MonthlyAttendanceData[]): number => {
  return webinarStats.reduce((total, item) => total + item.attendees, 0);
};

/**
 * Calculate attendance rate as a percentage
 */
export const calculateAttendanceRate = (totalRegistrants: number, totalAttendees: number): number => {
  if (totalRegistrants === 0) return 0;
  return Math.round((totalAttendees / totalRegistrants) * 100);
};
