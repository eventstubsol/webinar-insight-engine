
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
  getAverageDuration
} from './utils/statsUtils';

export const DashboardStats = () => {
  const { webinars, isLoading } = useZoomWebinars();
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      <StatCard
        title="Total Webinars"
        value={isLoading ? undefined : getTotalWebinars(webinars).toString()}
        description="Total webinars"
        icon={<Video className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading}
        cardColor="bg-blue-50 border-blue-200"
      />
      <StatCard
        title="Total Registrants"
        value={isLoading ? undefined : getTotalRegistrants(webinars).toString()}
        description="Registered participants"
        icon={<Users className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading}
        cardColor="bg-sky-50 border-sky-200"
      />
      <StatCard
        title="Total Attendees"
        value={isLoading ? undefined : getTotalAttendees(webinars).toString()}
        description="Attended participants"
        icon={<Users className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading}
        cardColor="bg-sky-50 border-sky-200"
      />
      <StatCard
        title="Attendance Rate"
        value={isLoading ? undefined : getAttendanceRate(webinars)}
        description="Attendance percentage"
        icon={<Activity className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading}
        cardColor="bg-green-50 border-green-200"
      />
      <StatCard
        title="Total Engagement"
        value={isLoading ? undefined : getTotalEngagement()}
        description="Total engagement time"
        icon={<Clock className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading}
        cardColor="bg-purple-50 border-purple-200"
      />
      <StatCard
        title="Avg. Duration"
        value={isLoading ? undefined : getAverageDuration(webinars)}
        description="Average webinar length"
        icon={<Clock className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading}
        cardColor="bg-green-50 border-green-200"
      />
    </div>
  );
};
