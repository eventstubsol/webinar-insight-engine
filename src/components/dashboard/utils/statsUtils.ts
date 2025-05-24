
import { ZoomWebinar } from '@/hooks/zoom';
import { startOfMonth, subMonths, isAfter, isBefore } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

// Database query functions for accurate participant counts
export const getTotalRegistrantsFromDB = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('zoom_webinar_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('participant_type', 'registrant');
    
    if (error) {
      console.error('Error fetching registrants count:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error in getTotalRegistrantsFromDB:', error);
    return 0;
  }
};

export const getTotalAttendeesFromDB = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('zoom_webinar_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('participant_type', 'attendee');
    
    if (error) {
      console.error('Error fetching attendees count:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error in getTotalAttendeesFromDB:', error);
    return 0;
  }
};

// Enhanced function to get participant counts by month from database
export const getMonthlyParticipantDataFromDB = async (userId: string): Promise<{
  [month: string]: { registrants: number; attendees: number; }
}> => {
  try {
    // Get all participant data with webinar join
    const { data: participants, error } = await supabase
      .from('zoom_webinar_participants')
      .select(`
        participant_type,
        webinar_id,
        zoom_webinars!inner(start_time)
      `)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching monthly participant data:', error);
      return {};
    }
    
    const monthlyData: { [month: string]: { registrants: number; attendees: number; } } = {};
    
    participants?.forEach((participant: any) => {
      const webinar = participant.zoom_webinars;
      if (webinar?.start_time) {
        const monthKey = format(new Date(webinar.start_time), 'MMMyy');
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { registrants: 0, attendees: 0 };
        }
        
        if (participant.participant_type === 'registrant') {
          monthlyData[monthKey].registrants++;
        } else if (participant.participant_type === 'attendee') {
          monthlyData[monthKey].attendees++;
        }
      }
    });
    
    return monthlyData;
  } catch (error) {
    console.error('Error in getMonthlyParticipantDataFromDB:', error);
    return {};
  }
};

// Fallback functions for when database query fails or for local calculations
export const getTotalWebinars = (webinars: ZoomWebinar[]): number => webinars.length;

export const getTotalRegistrants = (webinars: ZoomWebinar[]): number => {
  return webinars.reduce((total, webinar) => {
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
    let attendeeCount = 0;
    
    if (webinar.raw_data && typeof webinar.raw_data === 'object') {
      attendeeCount = webinar.raw_data?.participants_count || 0;
    } else if (webinar.participants_count !== undefined) {
      attendeeCount = webinar.participants_count;
    }
    
    return total + attendeeCount;
  }, 0);
};

export const getAttendanceRate = (registrants: number, attendees: number): string => {
  if (registrants === 0) return "0%";
  
  const rate = Math.round((attendees / registrants) * 100);
  return `${rate}%`;
};

export const getAverageDuration = (webinars: ZoomWebinar[]): string => {
  const webinarsWithDuration = webinars.filter(w => w.duration);
  if (webinarsWithDuration.length === 0) return "0h 00m";
  
  const totalDuration = webinarsWithDuration.reduce((sum, webinar) => sum + (webinar.duration || 0), 0);
  const avgMinutes = Math.round(totalDuration / webinarsWithDuration.length);
  
  const hours = Math.floor(avgMinutes / 60);
  const minutes = avgMinutes % 60;
  
  const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  
  return `${hours}h ${formattedMinutes}m`;
};

export const getTotalEngagement = (): string => {
  return "0h 00m";
};

// Check if we need to sync - only show if we have no data or very old data
export const needsSync = (webinars: ZoomWebinar[], lastSyncTime: Date | null): boolean => {
  if (webinars.length === 0) return true;
  if (!lastSyncTime) return true;
  
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return lastSyncTime < oneDayAgo;
};

// Enhanced function to check if participant data is available
export const hasParticipantData = (webinars: ZoomWebinar[]): boolean => {
  return webinars.some(webinar => {
    const rawData = webinar.raw_data as any;
    return rawData?.participant_data_updated_at || 
           (rawData?.registrants_count && rawData.registrants_count > 0) ||
           (rawData?.participants_count && rawData.participants_count > 0);
  });
};

// Check when participant data was last updated
export const getLastParticipantDataUpdate = (webinars: ZoomWebinar[]): Date | null => {
  let latestUpdate: Date | null = null;
  
  webinars.forEach(webinar => {
    const rawData = webinar.raw_data as any;
    if (rawData?.participant_data_updated_at) {
      const updateTime = new Date(rawData.participant_data_updated_at);
      if (!latestUpdate || updateTime > latestUpdate) {
        latestUpdate = updateTime;
      }
    }
  });
  
  return latestUpdate;
};

// Month-over-month comparison utilities
export const getCurrentMonthWebinars = (webinars: ZoomWebinar[]): ZoomWebinar[] => {
  const now = new Date();
  const startOfCurrentMonth = startOfMonth(now);
  
  return webinars.filter(webinar => {
    if (!webinar.start_time) return false;
    const webinarDate = new Date(webinar.start_time);
    return isAfter(webinarDate, startOfCurrentMonth) || webinar.start_time.startsWith(startOfCurrentMonth.toISOString().substr(0, 7));
  });
};

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

export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

export const formatTrendData = (percentageChange: number) => {
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
