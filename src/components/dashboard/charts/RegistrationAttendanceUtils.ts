
import { ZoomWebinar } from '@/hooks/zoom';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import { getMonthlyParticipantDataFromDB } from '../utils/statsUtils';

export interface MonthlyAttendanceData {
  month: string;
  monthDate: Date;
  registrants: number;
  attendees: number;
}

// Enhanced function that prioritizes database data over webinar data
export const calculateWebinarStats = async (
  webinars: ZoomWebinar[], 
  userId: string | undefined,
  isLoading: boolean = false
): Promise<MonthlyAttendanceData[]> => {
  if (isLoading || !webinars || webinars.length === 0 || !userId) {
    return [];
  }

  try {
    // Try to get data from database first
    const dbData = await getMonthlyParticipantDataFromDB(userId);
    const hasDbData = Object.keys(dbData).length > 0;
    
    // Generate the last 12 months
    const months: MonthlyAttendanceData[] = [];
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(currentDate, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, 'MMMyy');
      
      let registrants = 0;
      let attendees = 0;
      
      if (hasDbData && dbData[monthKey]) {
        // Use database data if available
        registrants = dbData[monthKey].registrants;
        attendees = dbData[monthKey].attendees;
      } else {
        // Fallback to webinar data calculation
        const monthWebinars = webinars.filter(webinar => {
          if (!webinar.start_time) return false;
          const webinarDate = new Date(webinar.start_time);
          return webinarDate >= monthStart && webinarDate <= monthEnd;
        });
        
        registrants = monthWebinars.reduce((sum, webinar) => {
          const count = webinar.raw_data?.registrants_count ?? webinar.registrants_count ?? 0;
          return sum + count;
        }, 0);
        
        attendees = monthWebinars.reduce((sum, webinar) => {
          const count = webinar.raw_data?.participants_count ?? webinar.participants_count ?? 0;
          return sum + count;
        }, 0);
      }
      
      months.push({
        month: monthKey,
        monthDate,
        registrants,
        attendees
      });
    }
    
    return months;
  } catch (error) {
    console.error('Error calculating webinar stats:', error);
    
    // Fallback to original calculation method
    return calculateWebinarStatsFromWebinarData(webinars);
  }
};

// Fallback synchronous function for webinar data only
const calculateWebinarStatsFromWebinarData = (webinars: ZoomWebinar[]): MonthlyAttendanceData[] => {
  const months: MonthlyAttendanceData[] = [];
  const currentDate = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(currentDate, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    // Filter webinars for this month
    const monthWebinars = webinars.filter(webinar => {
      if (!webinar.start_time) return false;
      const webinarDate = new Date(webinar.start_time);
      return webinarDate >= monthStart && webinarDate <= monthEnd;
    });
    
    // Calculate registrants and attendees from webinar data
    const registrants = monthWebinars.reduce((sum, webinar) => {
      const count = webinar.raw_data?.registrants_count ?? webinar.registrants_count ?? 0;
      return sum + count;
    }, 0);
    
    const attendees = monthWebinars.reduce((sum, webinar) => {
      const count = webinar.raw_data?.participants_count ?? webinar.participants_count ?? 0;
      return sum + count;
    }, 0);
    
    months.push({
      month: format(monthDate, 'MMMyy'),
      monthDate,
      registrants,
      attendees
    });
  }
  
  return months;
};

// Check if there's any meaningful data to display
export const hasChartData = (data: MonthlyAttendanceData[]): boolean => {
  if (!Array.isArray(data)) return false;
  return data.some(month => month.registrants > 0 || month.attendees > 0);
};
