import React from 'react';
import { Video, Users, Activity, Clock } from 'lucide-react';
import { useZoomWebinars } from '@/hooks/zoom';
import { StatCard } from './StatCard';
import { 
  getTotalWebinars,
  getTotalRegistrants,
  getTotalAttendees,
  getAttendanceRate,
  getTotalEngagement,
  getAverageDuration,
  getCurrentMonthWebinars,
  getPreviousMonthWebinars,
  calculatePercentageChange,
  formatTrendData
} from './utils/statsUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStatsProps {
  isRefreshing?: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ isRefreshing = false }) => {
  const { webinars, isLoading } = useZoomWebinars();
  
  // Calculate current and previous month data
  const currentMonthWebinars = !isLoading ? getCurrentMonthWebinars(webinars) : [];
  const previousMonthWebinars = !isLoading ? getPreviousMonthWebinars(webinars) : [];
  
  // Calculate metrics for current month
  const currentTotalWebinars = !isLoading ? currentMonthWebinars.length : 0;
  const currentTotalRegistrants = !isLoading ? getTotalRegistrants(currentMonthWebinars) : 0;
  const currentTotalAttendees = !isLoading ? getTotalAttendees(currentMonthWebinars) : 0;
  
  // Calculate metrics for previous month
  const previousTotalWebinars = !isLoading ? previousMonthWebinars.length : 0;
  const previousTotalRegistrants = !isLoading ? getTotalRegistrants(previousMonthWebinars) : 0;
  const previousTotalAttendees = !isLoading ? getTotalAttendees(previousMonthWebinars) : 0;
  
  // Calculate attendance rates
  const currentAttendanceRate = currentTotalRegistrants > 0 
    ? Math.round((currentTotalAttendees / currentTotalRegistrants) * 100)
    : 0;
  
  const previousAttendanceRate = previousTotalRegistrants > 0
    ? Math.round((previousTotalAttendees / previousTotalRegistrants) * 100)
    : 0;
  
  // Calculate percentage changes using the formatTrendData function that now returns properly typed data
  const webinarsTrend = formatTrendData(calculatePercentageChange(currentTotalWebinars, previousTotalWebinars));
  const registrantsTrend = formatTrendData(calculatePercentageChange(currentTotalRegistrants, previousTotalRegistrants));
  const attendeesTrend = formatTrendData(calculatePercentageChange(currentTotalAttendees, previousTotalAttendees));
  const attendanceRateTrend = formatTrendData(calculatePercentageChange(currentAttendanceRate, previousAttendanceRate));
  
  // Fixed values for metrics that don't have enough data
  const engagementTrend = { value: 0, label: "0%", direction: 'flat' as const };
  const durationTrend = { value: 0, label: "0%", direction: 'flat' as const };
  
  // Debug logging
  console.log('DashboardStats render:', {
    webinarsCount: webinars.length,
    currentMonthWebinars: currentMonthWebinars.length,
    totalRegistrants: getTotalRegistrants(webinars),
    totalAttendees: getTotalAttendees(webinars),
    hasRawData: webinars.some(w => !!w.raw_data),
    hasParticipantsCount: webinars.some(w => w.raw_data && typeof w.raw_data.participants_count !== 'undefined'),
    hasRegistrantsCount: webinars.some(w => w.raw_data && typeof w.raw_data.registrants_count !== 'undefined'),
    isLoading,
    isRefreshing
  });

  // If refreshing or loading, show skeleton state but keep previous data visible underneath
  if (isLoading && !isRefreshing && webinars.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative">
      {/* Overlay for refreshing state */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg z-10">
          <div className="animate-pulse text-sm text-muted-foreground">Refreshing data...</div>
        </div>
      )}
      
      <StatCard
        title="Total Webinars"
        value={isLoading ? undefined : getTotalWebinars(webinars).toString()}
        description="Total webinars"
        icon={<Video className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading && !isRefreshing && webinars.length === 0}
        cardColor="bg-blue-50 border-blue-200"
        trend={webinarsTrend}
      />
      <StatCard
        title="Total Registrants"
        value={isLoading ? undefined : getTotalRegistrants(webinars).toString()}
        description="Registered participants"
        icon={<Users className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading && !isRefreshing && webinars.length === 0}
        cardColor="bg-sky-50 border-sky-200"
        trend={registrantsTrend}
      />
      <StatCard
        title="Total Attendees"
        value={isLoading ? undefined : getTotalAttendees(webinars).toString()}
        description="Attended participants"
        icon={<Users className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading && !isRefreshing && webinars.length === 0}
        cardColor="bg-sky-50 border-sky-200"
        trend={attendeesTrend}
      />
      <StatCard
        title="Attendance Rate"
        value={isLoading ? undefined : getAttendanceRate(webinars)}
        description="Attendance percentage"
        icon={<Activity className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading && !isRefreshing && webinars.length === 0}
        cardColor="bg-green-50 border-green-200"
        trend={attendanceRateTrend}
      />
      <StatCard
        title="Total Engagement"
        value={isLoading ? undefined : getTotalEngagement()}
        description="Total engagement time"
        icon={<Clock className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading && !isRefreshing && webinars.length === 0}
        cardColor="bg-purple-50 border-purple-200"
        trend={engagementTrend}
      />
      <StatCard
        title="Avg. Duration"
        value={isLoading ? undefined : getAverageDuration(webinars)}
        description="Average webinar length"
        icon={<Clock className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading && !isRefreshing && webinars.length === 0}
        cardColor="bg-green-50 border-green-200"
        trend={durationTrend}
      />
    </div>
  );
};
