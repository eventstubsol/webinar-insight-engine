
import { ZoomWebinar } from '@/hooks/zoom';
import { startOfMonth, subMonths, isAfter, isBefore } from 'date-fns';

export const getTotalWebinars = (webinars: ZoomWebinar[]): number => webinars.length;

export const getTotalRegistrants = (webinars: ZoomWebinar[]): number => {
  return webinars.reduce((total, webinar) => {
    // Try to get registrants from different possible locations in the data
    let registrantCount = 0;
    
    if (webinar.raw_data && typeof webinar.raw_data === 'object') {
      registrantCount = webinar.raw_data?.registrants_count || 0;
    } else if (webinar.registrants_count !== undefined) {
      registrantCount = webinar.registrants_count;
    }
    
    return total + registrantCount;
  }, 0);
};

export const getTotalAttendees = (webinars: ZoomWebinar[]): number => {
  return webinars.reduce((total, webinar) => {
    // Try to get attendees from different possible locations in the data
    let attendeeCount = 0;
    
    if (webinar.raw_data && typeof webinar.raw_data === 'object') {
      attendeeCount = webinar.raw_data?.participants_count || 0;
    } else if (webinar.participants_count !== undefined) {
      attendeeCount = webinar.participants_count;
    }
    
    return total + attendeeCount;
  }, 0);
};

export const getAttendanceRate = (webinars: ZoomWebinar[]): string => {
  const registrants = getTotalRegistrants(webinars);
  const attendees = getTotalAttendees(webinars);
  
  if (registrants === 0) return "0%";
  
  const rate = Math.round((attendees / registrants) * 100);
  return `${rate}%`;
};

// Check if any webinar has participant data
export const hasParticipantData = (webinars: ZoomWebinar[]): boolean => {
  return webinars.some(webinar => {
    const hasRegistrants = (webinar.raw_data?.registrants_count ?? 0) > 0 || 
                          (webinar.registrants_count ?? 0) > 0;
    const hasParticipants = (webinar.raw_data?.participants_count ?? 0) > 0 || 
                           (webinar.participants_count ?? 0) > 0;
    return hasRegistrants || hasParticipants;
  });
};

// Check if participant data was updated (has the update timestamp)
export const hasRecentParticipantUpdate = (webinars: ZoomWebinar[]): boolean => {
  return webinars.some(webinar => {
    return webinar.raw_data?.participant_data_updated_at !== undefined;
  });
};

export const getTotalEngagement = (): string => {
  // This would ideally be calculated from actual engagement metrics
  return "0h 00m";
};

export const getAverageDuration = (webinars: ZoomWebinar[]): string => {
  const webinarsWithDuration = webinars.filter(w => w.duration);
  if (webinarsWithDuration.length === 0) return "0h 00m";
  
  const totalDuration = webinarsWithDuration.reduce((sum, webinar) => sum + (webinar.duration || 0), 0);
  const avgMinutes = Math.round(totalDuration / webinarsWithDuration.length);
  
  const hours = Math.floor(avgMinutes / 60);
  const minutes = avgMinutes % 60;
  
  // Ensure minutes are always displayed with two digits
  const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  
  return `${hours}h ${formattedMinutes}m`;
};

// New utility functions for month-over-month comparison

// Filter webinars for current month
export const getCurrentMonthWebinars = (webinars: ZoomWebinar[]): ZoomWebinar[] => {
  const now = new Date();
  const startOfCurrentMonth = startOfMonth(now);
  
  return webinars.filter(webinar => {
    if (!webinar.start_time) return false;
    const webinarDate = new Date(webinar.start_time);
    return isAfter(webinarDate, startOfCurrentMonth) || webinar.start_time.startsWith(startOfCurrentMonth.toISOString().substr(0, 7));
  });
};

// Filter webinars for previous month
export const getPreviousMonthWebinars = (webinars: ZoomWebinar[]): ZoomWebinar[] => {
  const now = new Date();
  const startOfCurrentMonth = startOfMonth(now);
  const startOfPreviousMonth = startOfMonth(subMonths(now, 1));
  
  return webinars.filter(webinar => {
    if (!webinar.start_time) return false;
    const webinarDate = new Date(webinar.start_time);
    return (isAfter(webinarDate, startOfPreviousMonth) || webinarDate.getTime() === startOfPreviousMonth.getTime()) 
      && isBefore(webinarDate, startOfCurrentMonth);
  });
};

// Calculate percentage change
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// Format trend data with proper direction typing
export const formatTrendData = (percentageChange: number) => {
  // Explicitly type the direction as the union type expected by TrendData
  const direction: 'up' | 'down' | 'flat' = 
    percentageChange > 0 ? 'up' : 
    percentageChange < 0 ? 'down' : 
    'flat';
    
  const label = `${percentageChange > 0 ? '+' : ''}${percentageChange}%`;
  
  return {
    value: percentageChange,
    label,
    direction
  };
};
