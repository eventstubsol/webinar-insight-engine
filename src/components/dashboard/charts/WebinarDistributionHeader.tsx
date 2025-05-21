
import React from 'react';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar } from 'lucide-react';
import { TimeRangeView } from '@/hooks/useWebinarDistribution';

interface WebinarDistributionHeaderProps {
  description: string;
  timeRange: TimeRangeView;
  onTimeRangeChange: (value: TimeRangeView) => void;
}

export const WebinarDistributionHeader: React.FC<WebinarDistributionHeaderProps> = ({
  description,
  timeRange,
  onTimeRangeChange
}) => {
  return (
    <div className="flex flex-row items-center justify-between pb-2">
      <div className="space-y-0.5">
        <CardTitle className="text-base font-semibold">Monthly Webinar Distribution</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      <div className="flex items-center space-x-2">
        <ToggleGroup 
          type="single" 
          value={timeRange} 
          onValueChange={(value) => value && onTimeRangeChange(value as TimeRangeView)}
        >
          <ToggleGroupItem value="past" aria-label="Last 12 Months" className="text-xs">
            Last 12 Months
          </ToggleGroupItem>
          <ToggleGroupItem value="future" aria-label="Next 12 Months" className="text-xs">
            Next 12 Months
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Calendar className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};
