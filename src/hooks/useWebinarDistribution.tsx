
import { useMemo, useState } from 'react';
import { useZoomWebinars } from '@/hooks/zoom';
import { parseISO, format, isValid, subMonths, startOfMonth, addMonths, isBefore, isAfter } from 'date-fns';

export type TimeRangeView = 'past' | 'future';

export function useWebinarDistribution(initialTimeRange: TimeRangeView = 'past') {
  const { webinars, isLoading } = useZoomWebinars();
  const [timeRange, setTimeRange] = useState<TimeRangeView>(initialTimeRange);
  
  const monthlyDistribution = useMemo(() => {
    const today = new Date();
    let monthsArray = [];
    
    if (timeRange === 'past') {
      // Generate the last 12 months for past view
      monthsArray = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(today, 11 - i); // Start from 11 months ago
        const monthStart = startOfMonth(date);
        const monthKey = format(monthStart, 'MMMyy');
        const month = format(monthStart, 'MMM');
        const year = format(monthStart, 'yy');
        
        return {
          date: monthStart,
          monthKey,
          month,
          year,
          monthYear: monthKey,
          total: 0
        };
      });
    } else {
      // Generate the next 12 months for future view
      monthsArray = Array.from({ length: 12 }, (_, i) => {
        const date = addMonths(today, i); // Start from current month
        const monthStart = startOfMonth(date);
        const monthKey = format(monthStart, 'MMMyy');
        const month = format(monthStart, 'MMM');
        const year = format(monthStart, 'yy');
        
        return {
          date: monthStart,
          monthKey,
          month,
          year,
          monthYear: monthKey,
          total: 0
        };
      });
    }
    
    // Create a map for fast lookup
    const distributionMap = new Map(
      monthsArray.map(item => [item.monthKey, item])
    );
    
    // If we have webinar data, update the counts
    if (webinars && webinars.length > 0) {
      webinars.forEach(webinar => {
        if (!webinar.start_time) return;
        
        try {
          const date = parseISO(webinar.start_time);
          if (!isValid(date)) return;
          
          const monthKey = format(date, 'MMMyy');
          const isPastWebinar = isBefore(date, today) || webinar.status === 'ended';
          const isFutureWebinar = isAfter(date, today) && webinar.status !== 'ended';
          
          // Only update if this month is in our window and matches the selected view
          if (distributionMap.has(monthKey)) {
            if ((timeRange === 'past' && isPastWebinar) || 
                (timeRange === 'future' && isFutureWebinar)) {
              const entry = distributionMap.get(monthKey);
              if (entry) {
                entry.total += 1;
              }
            }
          }
        } catch (error) {
          console.error('Error parsing date:', webinar.start_time, error);
        }
      });
    }
    
    // Convert map back to array and ensure it's sorted by date
    return Array.from(distributionMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [webinars, timeRange]);

  const getCardDescription = () => {
    return timeRange === 'past' 
      ? "Last 12 months of webinar activity" 
      : "Next 12 months of scheduled webinars";
  };

  return {
    monthlyDistribution,
    isLoading,
    timeRange,
    setTimeRange,
    getCardDescription
  };
}
