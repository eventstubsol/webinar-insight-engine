
import React, { useState, useEffect } from 'react';
import { Video, Users, Activity, Clock } from 'lucide-react';
import { useZoomWebinars } from '@/hooks/zoom';
import { StatCard } from './StatCard';
import { useAuth } from '@/hooks/useAuth';
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
  formatTrendData,
  getTotalRegistrantsFromDB,
  getTotalAttendeesFromDB
} from './utils/statsUtils';

export const DashboardStats = () => {
  const { user } = useAuth();
  const { webinars, isLoading } = useZoomWebinars();
  const [dbRegistrants, setDbRegistrants] = useState<number>(0);
  const [dbAttendees, setDbAttendees] = useState<number>(0);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);

  // Load participant counts from database
  useEffect(() => {
    const loadParticipantCounts = async () => {
      if (!user?.id) return;
      
      setIsLoadingParticipants(true);
      try {
        const [registrantsCount, attendeesCount] = await Promise.all([
          getTotalRegistrantsFromDB(user.id),
          getTotalAttendeesFromDB(user.id)
        ]);
        
        setDbRegistrants(registrantsCount);
        setDbAttendees(attendeesCount);
      } catch (error) {
        console.error('Error loading participant counts:', error);
      } finally {
        setIsLoadingParticipants(false);
      }
    };

    loadParticipantCounts();
  }, [user?.id, webinars]); // Refresh when webinars change

  // Calculate current and previous month data for trends
  const currentMonthWebinars = !isLoading ? getCurrentMonthWebinars(webinars) : [];
  const previousMonthWebinars = !isLoading ? getPreviousMonthWebinars(webinars) : [];
  
  // Calculate total metrics (for main display)
  const totalWebinars = !isLoading ? getTotalWebinars(webinars) : 0;
  
  // Use database counts as primary source, fallback to webinar data
  const totalRegistrants = dbRegistrants > 0 ? dbRegistrants : getTotalRegistrants(webinars);
  const totalAttendees = dbAttendees > 0 ? dbAttendees : getTotalAttendees(webinars);
  const totalAttendanceRate = getAttendanceRate(totalRegistrants, totalAttendees);
  
  // Calculate metrics for current month (for trends)
  const currentTotalWebinars = !isLoading ? currentMonthWebinars.length : 0;
  const currentTotalRegistrants = !isLoading ? getTotalRegistrants(currentMonthWebinars) : 0;
  const currentTotalAttendees = !isLoading ? getTotalAttendees(currentMonthWebinars) : 0;
  
  // Calculate metrics for previous month (for trends)
  const previousTotalWebinars = !isLoading ? previousMonthWebinars.length : 0;
  const previousTotalRegistrants = !isLoading ? getTotalRegistrants(previousMonthWebinars) : 0;
  const previousTotalAttendees = !isLoading ? getTotalAttendees(previousMonthWebinars) : 0;
  
  // Calculate attendance rates for trends
  const currentAttendanceRate = currentTotalRegistrants > 0 
    ? Math.round((currentTotalAttendees / currentTotalRegistrants) * 100)
    : 0;
  
  const previousAttendanceRate = previousTotalRegistrants > 0
    ? Math.round((previousTotalAttendees / previousTotalRegistrants) * 100)
    : 0;
  
  // Calculate percentage changes
  const webinarsTrend = formatTrendData(calculatePercentageChange(currentTotalWebinars, previousTotalWebinars));
  const registrantsTrend = formatTrendData(calculatePercentageChange(currentTotalRegistrants, previousTotalRegistrants));
  const attendeesTrend = formatTrendData(calculatePercentageChange(currentTotalAttendees, previousTotalAttendees));
  const attendanceRateTrend = formatTrendData(calculatePercentageChange(currentAttendanceRate, previousAttendanceRate));
  
  // Fixed trends for metrics we don't have real data for
  const engagementTrend = { value: 0, label: "0%", direction: 'flat' as const };
  const durationTrend = { value: 0, label: "0%", direction: 'flat' as const };
  
  const isStatsLoading = isLoading || isLoadingParticipants;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        title="Total Webinars"
        value={isStatsLoading ? undefined : totalWebinars.toString()}
        description="Total webinars"
        icon={<Video className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isStatsLoading}
        cardColor="bg-blue-50 border-blue-200"
        trend={webinarsTrend}
      />
      <StatCard
        title="Total Registrants"
        value={isStatsLoading ? undefined : totalRegistrants.toString()}
        description="Registered participants"
        icon={<Users className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isStatsLoading}
        cardColor="bg-sky-50 border-sky-200"
        trend={registrantsTrend}
      />
      <StatCard
        title="Total Attendees"
        value={isStatsLoading ? undefined : totalAttendees.toString()}
        description="Attended participants"
        icon={<Users className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isStatsLoading}
        cardColor="bg-sky-50 border-sky-200"
        trend={attendeesTrend}
      />
      <StatCard
        title="Attendance Rate"
        value={isStatsLoading ? undefined : totalAttendanceRate}
        description="Attendance percentage"
        icon={<Activity className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isStatsLoading}
        cardColor="bg-green-50 border-green-200"
        trend={attendanceRateTrend}
      />
      <StatCard
        title="Total Engagement"
        value={isStatsLoading ? undefined : getTotalEngagement()}
        description="Total engagement time"
        icon={<Clock className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isStatsLoading}
        cardColor="bg-purple-50 border-purple-200"
        trend={engagementTrend}
      />
      <StatCard
        title="Avg. Duration"
        value={isStatsLoading ? undefined : getAverageDuration(webinars)}
        description="Average webinar length"
        icon={<Clock className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isStatsLoading}
        cardColor="bg-green-50 border-green-200"
        trend={durationTrend}
      />
    </div>
  );
};
