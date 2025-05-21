
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Video, Users, Activity, Clock } from 'lucide-react';
import { useZoomWebinars } from '@/hooks/zoom';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface StatProps {
  title: string;
  value: string | React.ReactNode;
  description: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  cardColor?: string;
}

const Stat = ({ title, value, description, icon, isLoading = false, cardColor }: StatProps) => {
  return (
    <Card className={cardColor}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
        <CardTitle className="text-xs font-medium sm:text-sm">{title}</CardTitle>
        <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        {isLoading ? (
          <Skeleton className="h-6 w-20 mb-1" />
        ) : (
          <div className="text-lg sm:text-xl font-bold">{value}</div>
        )}
        <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
      </CardContent>
    </Card>
  );
};

export const DashboardStats = () => {
  const { webinars, isLoading } = useZoomWebinars();
  
  // Calculate stats from real data
  const getTotalWebinars = () => webinars.length;
  
  // Calculate total registrants from webinar data
  const getTotalRegistrants = () => {
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
  
  // Calculate total attendees
  const getTotalAttendees = () => {
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
  
  // Calculate attendance rate
  const getAttendanceRate = () => {
    const registrants = getTotalRegistrants();
    const attendees = getTotalAttendees();
    
    if (registrants === 0) return "0%";
    
    const rate = Math.round((attendees / registrants) * 100);
    return `${rate}%`;
  };
  
  // Calculate total engagement (placeholder)
  const getTotalEngagement = () => {
    // This would ideally be calculated from actual engagement metrics
    return "0h 0m";
  };
  
  // Calculate average duration
  const getAverageDuration = () => {
    const webinarsWithDuration = webinars.filter(w => w.duration);
    if (webinarsWithDuration.length === 0) return "0h 0m";
    
    const totalDuration = webinarsWithDuration.reduce((sum, webinar) => sum + (webinar.duration || 0), 0);
    const avgMinutes = Math.round(totalDuration / webinarsWithDuration.length);
    
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    
    return `${hours}h ${minutes}m`;
  };
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      <Stat
        title="Total Webinars"
        value={isLoading ? <Skeleton className="h-6 w-12" /> : getTotalWebinars().toString()}
        description="Total webinars"
        icon={<Video className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading}
        cardColor="bg-blue-50 border-blue-200"
      />
      <Stat
        title="Total Registrants"
        value={isLoading ? <Skeleton className="h-6 w-12" /> : getTotalRegistrants().toString()}
        description="Registered participants"
        icon={<Users className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading}
        cardColor="bg-sky-50 border-sky-200"
      />
      <Stat
        title="Total Attendees"
        value={isLoading ? <Skeleton className="h-6 w-12" /> : getTotalAttendees().toString()}
        description="Attended participants"
        icon={<Users className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading}
        cardColor="bg-sky-50 border-sky-200"
      />
      <Stat
        title="Attendance Rate"
        value={isLoading ? <Skeleton className="h-6 w-12" /> : getAttendanceRate()}
        description="Attendance percentage"
        icon={<Activity className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading}
        cardColor="bg-green-50 border-green-200"
      />
      <Stat
        title="Total Engagement"
        value={isLoading ? <Skeleton className="h-6 w-20" /> : getTotalEngagement()}
        description="Total engagement time"
        icon={<Clock className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading}
        cardColor="bg-purple-50 border-purple-200"
      />
      <Stat
        title="Avg. Duration"
        value={isLoading ? <Skeleton className="h-6 w-20" /> : getAverageDuration()}
        description="Average webinar length"
        icon={<Clock className="h-3 w-3 sm:h-4 sm:w-4" />}
        isLoading={isLoading}
        cardColor="bg-green-50 border-green-200"
      />
    </div>
  );
};
