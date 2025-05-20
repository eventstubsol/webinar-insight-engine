
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
import { useZoomWebinarParticipants } from '@/hooks/zoom';
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24 mb-2" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
};

export const DashboardStats = () => {
  const { webinars, isLoading } = useZoomWebinars();
  
  // Calculate stats from real data
  const getTotalWebinars = () => webinars.length;
  
  // Calculate total registrants from webinar participants
  const getTotalRegistrants = () => {
    // This would ideally come from the API but for now we'll return a placeholder
    return 0;
  };
  
  // Calculate total attendees
  const getTotalAttendees = () => {
    // This would ideally come from the API but for now we'll return a placeholder
    return 0;
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Stat
        title="Total Webinars"
        value={isLoading ? <Skeleton className="h-7 w-14" /> : getTotalWebinars().toString()}
        description="Total webinars"
        icon={<Video className="h-4 w-4" />}
        isLoading={isLoading}
        cardColor="bg-blue-50 border-blue-200"
      />
      <Stat
        title="Total Registrants"
        value={isLoading ? <Skeleton className="h-7 w-14" /> : getTotalRegistrants().toString()}
        description="Registered participants"
        icon={<Users className="h-4 w-4" />}
        isLoading={isLoading}
        cardColor="bg-sky-50 border-sky-200"
      />
      <Stat
        title="Total Attendees"
        value={isLoading ? <Skeleton className="h-7 w-14" /> : getTotalAttendees().toString()}
        description="Attended participants"
        icon={<Users className="h-4 w-4" />}
        isLoading={isLoading}
        cardColor="bg-sky-50 border-sky-200"
      />
      <Stat
        title="Attendance Rate"
        value={isLoading ? <Skeleton className="h-7 w-14" /> : getAttendanceRate()}
        description="Attendance percentage"
        icon={<Activity className="h-4 w-4" />}
        isLoading={isLoading}
        cardColor="bg-green-50 border-green-200"
      />
      <Stat
        title="Total Engagement"
        value={isLoading ? <Skeleton className="h-7 w-28" /> : getTotalEngagement()}
        description="Total engagement time"
        icon={<Clock className="h-4 w-4" />}
        isLoading={isLoading}
        cardColor="bg-purple-50 border-purple-200"
      />
      <Stat
        title="Avg. Duration"
        value={isLoading ? <Skeleton className="h-7 w-24" /> : getAverageDuration()}
        description="Average webinar length"
        icon={<Clock className="h-4 w-4" />}
        isLoading={isLoading}
        cardColor="bg-green-50 border-green-200"
      />
    </div>
  );
};
