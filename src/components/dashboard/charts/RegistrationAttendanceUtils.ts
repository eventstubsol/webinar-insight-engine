
import { ZoomWebinar } from '@/hooks/zoom';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

export interface MonthlyAttendanceData {
  month: string;
  monthDate: Date;
  registrants: number;
  attendees: number;
}

// Synchronous function that calculates webinar stats from the provided data
export const calculateWebinarStats = (webinars: ZoomWebinar[], isLoading: boolean = false): MonthlyAttendanceData[] => {
  if (isLoading || !webinars || webinars.length === 0) {
    return [];
  }

  // Generate the last 12 months
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
    let registrants = 0;
    let attendees = 0;
    
    registrants = monthWebinars.reduce((sum, webinar) => {
      const count = webinar.raw_data?.registrants_count ?? webinar.registrants_count ?? 0;
      return sum + count;
    }, 0);
    
    attendees = monthWebinars.reduce((sum, webinar) => {
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
