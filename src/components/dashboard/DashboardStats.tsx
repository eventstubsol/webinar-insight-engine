
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, BarChart, Clock, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useZoomWebinars } from '@/hooks/zoom';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface StatProps {
  title: string;
  value: string | React.ReactNode;
  description: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  isLoading?: boolean;
}

const Stat = ({ title, value, description, trend, icon, isLoading = false }: StatProps) => {
  return (
    <Card>
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
        <div className="flex items-center space-x-2">
          <CardDescription>{description}</CardDescription>
          {!isLoading && trend && (
            <div className={`flex items-center text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const DashboardStats = () => {
  const { webinars, isLoading } = useZoomWebinars();
  
  // Calculate stats from real data
  const getTotalWebinars = () => webinars.length;
  
  const getUpcomingWebinars = () => {
    const now = new Date();
    return webinars.filter(webinar => {
      if (!webinar.start_time) return false;
      return new Date(webinar.start_time) > now;
    }).length;
  };
  
  const getPastWebinars = () => {
    const now = new Date();
    return webinars.filter(webinar => {
      if (!webinar.start_time) return false;
      return new Date(webinar.start_time) <= now;
    }).length;
  };
  
  const getAverageDuration = () => {
    const webinarsWithDuration = webinars.filter(w => w.duration);
    if (webinarsWithDuration.length === 0) return 0;
    
    const totalDuration = webinarsWithDuration.reduce((sum, webinar) => sum + (webinar.duration || 0), 0);
    return Math.round(totalDuration / webinarsWithDuration.length);
  };
  
  const getLastWebinarDate = () => {
    const pastWebinars = webinars
      .filter(w => w.start_time)
      .sort((a, b) => {
        if (!a.start_time || !b.start_time) return 0;
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      });
      
    return pastWebinars.length > 0 && pastWebinars[0].start_time
      ? format(parseISO(pastWebinars[0].start_time), 'MMM d, yyyy')
      : 'No data';
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Stat
        title="Total Webinars"
        value={isLoading ? <Skeleton className="h-7 w-14" /> : getTotalWebinars().toString()}
        description="Total webinars"
        icon={<Calendar className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <Stat
        title="Upcoming Webinars"
        value={isLoading ? <Skeleton className="h-7 w-14" /> : getUpcomingWebinars().toString()}
        description="Scheduled webinars"
        icon={<Clock className="h-4 w-4" />}
        trend={!isLoading ? {
          value: Math.round((getUpcomingWebinars() / Math.max(getTotalWebinars(), 1)) * 100),
          isPositive: true
        } : undefined}
        isLoading={isLoading}
      />
      <Stat
        title="Past Webinars"
        value={isLoading ? <Skeleton className="h-7 w-14" /> : getPastWebinars().toString()}
        description="Completed webinars"
        icon={<BarChart className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <Stat
        title="Average Duration"
        value={isLoading ? <Skeleton className="h-7 w-14" /> : `${getAverageDuration()} min`}
        description="Per webinar"
        icon={<Clock className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <Stat
        title="Last Webinar"
        value={isLoading ? <Skeleton className="h-7 w-28" /> : getLastWebinarDate()}
        description="Most recent webinar"
        icon={<Calendar className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <Stat
        title="Zoom Account"
        value={isLoading ? <Skeleton className="h-7 w-24" /> : "Connected"}
        description="API integration status"
        icon={<Users className="h-4 w-4" />}
        isLoading={isLoading}
      />
    </div>
  );
};
