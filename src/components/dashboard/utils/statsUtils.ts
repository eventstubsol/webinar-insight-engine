
import { ZoomWebinar } from '@/hooks/zoom';

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
