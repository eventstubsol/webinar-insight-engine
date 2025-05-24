
import { ZoomWebinar } from '@/hooks/zoom';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface MonthlyAttendanceData {
  month: string;
  monthDate: Date;
  registrants: number;
  attendees: number;
}

// Enhanced function that queries database for accurate participant counts
export const calculateWebinarStats = async (webinars: ZoomWebinar[], isLoading: boolean = false): Promise<MonthlyAttendanceData[]> => {
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
    
    // Try to get accurate counts from database first
    let registrants = 0;
    let attendees = 0;
    
    try {
      // Get webinar IDs for this month
      const webinarIds = monthWebinars.map(w => w.webinar_id).filter(Boolean);
      
      if (webinarIds.length > 0) {
        // Query database for registrants
        const { count: registrantsCount } = await supabase
          .from('zoom_webinar_participants')
          .select('*', { count: 'exact', head: true })
          .in('webinar_id', webinarIds)
          .eq('participant_type', 'registrant');
        
        // Query database for attendees
        const { count: attendeesCount } = await supabase
          .from('zoom_webinar_participants')
          .select('*', { count: 'exact', head: true })
          .in('webinar_id', webinarIds)
          .eq('participant_type', 'attendee');
        
        registrants = registrantsCount || 0;
        attendees = attendeesCount || 0;
      }
      
      // Fallback to webinar raw_data if database query doesn't return results
      if (registrants === 0 && attendees === 0) {
        registrants = monthWebinars.reduce((sum, webinar) => {
          const count = webinar.raw_data?.registrants_count ?? webinar.registrants_count ?? 0;
          return sum + count;
        }, 0);
        
        attendees = monthWebinars.reduce((sum, webinar) => {
          const count = webinar.raw_data?.participants_count ?? webinar.participants_count ?? 0;
          return sum + count;
        }, 0);
      }
    } catch (error) {
      console.error('Error querying participant data for month:', monthDate, error);
      
      // Fallback to raw_data from webinars
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
  return data.some(month => month.registrants > 0 || month.attendees > 0);
};
