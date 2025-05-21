
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChartIcon } from 'lucide-react';
import { WebinarDistributionBarChart } from './WebinarDistributionBarChart';
import { TimeRangeView } from '@/hooks/useWebinarDistribution';

interface WebinarDistributionContentProps {
  isLoading: boolean;
  monthlyDistribution: any[];
  timeRange: TimeRangeView;
}

export const WebinarDistributionContent: React.FC<WebinarDistributionContentProps> = ({
  isLoading,
  monthlyDistribution,
  timeRange
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (monthlyDistribution.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <BarChartIcon className="h-12 w-12 mb-2" />
        <p>No webinar data available</p>
      </div>
    );
  }
  
  return <WebinarDistributionBarChart data={monthlyDistribution} timeRange={timeRange} />;
};
