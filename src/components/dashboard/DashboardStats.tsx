
import React, { useState } from 'react';
import { Video, Users, Activity, Clock } from 'lucide-react';
import { useZoomWebinars } from '@/hooks/zoom';
import { StatCard } from './StatCard';
import { EmptyMetricsState } from './EmptyMetricsState';
import { AttendeeDataAlert } from './AttendeeDataAlert';
import { updateParticipantDataOperation } from '@/hooks/zoom/operations';
import { useQueryClient } from '@tanstack/react-query';
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
  hasParticipantData,
  hasRecentParticipantUpdate,
  hasAttendeeData,
  needsSync
} from './utils/statsUtils';

export const DashboardStats = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { webinars, isLoading, lastSyncTime } = useZoomWebinars();
  const [isUpdatingParticipants, setIsUpdatingParticipants] = useState(false);
  
  // Check if we have participant data
  const hasData = !isLoading && hasParticipantData(webinars);
  const hasUpdate = !isLoading && hasRecentParticipantUpdate(webinars);
  const hasAttendees = !isLoading && hasAttendeeData(webinars);
  const shouldSync = !isLoading && needsSync(webinars, lastSyncTime);
  
  // Handle participant data update
  const handleUpdateParticipantData = async () => {
    setIsUpdatingParticipants(true);
    try {
      await updateParticipantDataOperation(user?.id, queryClient);
    } catch (error) {
      console.error('Error updating participant data:', error);
    } finally {
      setIsUpdatingParticipants(false);
    }
  };
  
  // If we don't have any webinars and need to sync, show the empty state
  if (!isLoading && webinars.length === 0 && shouldSync) {
    return <EmptyMetricsState onUpdateParticipantData={handleUpdateParticipantData} isUpdating={isUpdatingParticipants} />;
  }
  
  // Calculate current and previous month data for trends
  const currentMonthWebinars = !isLoading ? getCurrentMonthWebinars(webinars) : [];
  const previousMonthWebinars = !isLoading ? getPreviousMonthWebinars(webinars) : [];
  
  // Calculate total metrics (for main display)
  const totalWebinars = !isLoading ? getTotalWebinars(webinars) : 0;
  const totalRegistrants = !isLoading ? getTotalRegistrants(webinars) : 0;
  const totalAttendees = !isLoading ? getTotalAttendees(webinars) : 0;
  const totalAttendanceRate = !isLoading ? getAttendanceRate(webinars) : '0%';
  
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
  
  // Calculate percentage changes using the formatTrendData function that now returns properly typed data
  const webinarsTrend = formatTrendData(calculatePercentageChange(currentTotalWebinars, previousTotalWebinars));
  const registrantsTrend = formatTrendData(calculatePercentageChange(currentTotalRegistrants, previousTotalRegistrants));
  const attendeesTrend = formatTrendData(calculatePercentageChange(currentTotalAttendees, previousTotalAttendees));
  const attendanceRateTrend = formatTrendData(calculatePercentageChange(currentAttendanceRate, previousAttendanceRate));
  
  // We don't have real data for these metrics, so we'll use flat trends with proper typing
  const engagementTrend = { value: 0, label: "0%", direction: 'flat' as const };
  const durationTrend = { value: 0, label: "0%", direction: 'flat' as const };
  
  return (
    <div className="space-y-4">
      {/* Only show alert if we have webinars but issues with attendee data */}
      {!isLoading && webinars.length > 0 && !hasAttendees && (
        <AttendeeDataAlert 
          webinars={webinars}
          onUpdateData={handleUpdateParticipantData}
          isUpdating={isUpdatingParticipants}
        />
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Webinars"
          value={isLoading ? undefined : totalWebinars.toString()}
          description="Total webinars"
          icon={<Video className="h-3 w-3 sm:h-4 sm:w-4" />}
          isLoading={isLoading}
          cardColor="bg-blue-50 border-blue-200"
          trend={webinarsTrend}
        />
        <StatCard
          title="Total Registrants"
          value={isLoading ? undefined : totalRegistrants.toString()}
          description="Registered participants"
          icon={<Users className="h-3 w-3 sm:h-4 sm:w-4" />}
          isLoading={isLoading}
          cardColor="bg-sky-50 border-sky-200"
          trend={registrantsTrend}
        />
        <StatCard
          title="Total Attendees"
          value={isLoading ? undefined : (totalAttendees > 0 ? totalAttendees.toString() : "Update needed")}
          description="Attended participants"
          icon={<Users className="h-3 w-3 sm:h-4 sm:w-4" />}
          isLoading={isLoading}
          cardColor="bg-sky-50 border-sky-200"
          trend={attendeesTrend}
        />
        <StatCard
          title="Attendance Rate"
          value={isLoading ? undefined : (totalAttendees > 0 ? totalAttendanceRate : "Update needed")}
          description="Attendance percentage"
          icon={<Activity className="h-3 w-3 sm:h-4 sm:w-4" />}
          isLoading={isLoading}
          cardColor="bg-green-50 border-green-200"
          trend={attendanceRateTrend}
        />
        <StatCard
          title="Total Engagement"
          value={isLoading ? undefined : getTotalEngagement()}
          description="Total engagement time"
          icon={<Clock className="h-3 w-3 sm:h-4 sm:w-4" />}
          isLoading={isLoading}
          cardColor="bg-purple-50 border-purple-200"
          trend={engagementTrend}
        />
        <StatCard
          title="Avg. Duration"
          value={isLoading ? undefined : getAverageDuration(webinars)}
          description="Average webinar length"
          icon={<Clock className="h-3 w-3 sm:h-4 sm:w-4" />}
          isLoading={isLoading}
          cardColor="bg-green-50 border-green-200"
          trend={durationTrend}
        />
      </div>
    </div>
  );
};
