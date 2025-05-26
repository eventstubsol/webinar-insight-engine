
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock } from 'lucide-react';
import { useActualTimingData } from '@/hooks/zoom/useActualTimingData';
import { ZoomWebinar } from '@/hooks/zoom';

interface ActualTimingButtonProps {
  webinar: ZoomWebinar;
  onDataFetched?: () => void;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
}

export const ActualTimingButton: React.FC<ActualTimingButtonProps> = ({
  webinar,
  onDataFetched,
  size = 'sm',
  variant = 'outline'
}) => {
  const { fetchActualTimingData, isLoading } = useActualTimingData();
  
  // Only show for completed webinars that don't have actual timing data
  const isCompleted = webinar.status === 'ended' || webinar.status === 'aborted';
  const hasActualData = webinar.actual_start_time || webinar.actual_duration;
  
  if (!isCompleted || hasActualData) {
    return null;
  }

  const handleFetchTiming = async () => {
    try {
      await fetchActualTimingData(webinar.id);
      if (onDataFetched) {
        onDataFetched();
      }
    } catch (error) {
      console.error('Failed to fetch actual timing data:', error);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size}
          onClick={handleFetchTiming}
          disabled={isLoading}
          className="gap-1"
        >
          <Clock className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {size !== 'icon' && (isLoading ? 'Fetching...' : 'Get Timing')}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Fetch actual start time and duration for this completed webinar</p>
      </TooltipContent>
    </Tooltip>
  );
};
