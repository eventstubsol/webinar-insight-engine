
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { WebinarDistributionHeader } from './charts/WebinarDistributionHeader';
import { WebinarDistributionContent } from './charts/WebinarDistributionContent';
import { useWebinarDistribution } from '@/hooks/useWebinarDistribution';

export const WebinarDistributionChart = () => {
  const { 
    monthlyDistribution, 
    isLoading, 
    timeRange, 
    setTimeRange,
    getCardDescription 
  } = useWebinarDistribution();

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-0">
        <WebinarDistributionHeader
          description={getCardDescription()}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      </CardHeader>
      <CardContent className="w-full h-80">
        <WebinarDistributionContent
          isLoading={isLoading}
          monthlyDistribution={monthlyDistribution}
          timeRange={timeRange}
        />
      </CardContent>
    </Card>
  );
};
