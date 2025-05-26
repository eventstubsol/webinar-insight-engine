
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TimingDataFetchButtonProps {
  webinar: any;
  onSuccess?: () => void;
  className?: string;
}

export const TimingDataFetchButton: React.FC<TimingDataFetchButtonProps> = ({
  webinar,
  onSuccess,
  className
}) => {
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchResult, setLastFetchResult] = useState<'success' | 'error' | null>(null);

  const fetchTimingData = async () => {
    if (!webinar?.id) {
      toast({
        title: 'Error',
        description: 'No webinar ID provided',
        variant: 'destructive'
      });
      return;
    }

    setIsFetching(true);
    setLastFetchResult(null);

    try {
      console.log('[TimingDataFetchButton] Fetching timing data for webinar:', webinar.id);
      
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: {
          action: 'fetch-timing-data',
          webinar_id: webinar.id.toString(),
          webinar_uuid: webinar.webinar_uuid || webinar.uuid
        }
      });

      if (error) {
        console.error('[TimingDataFetchButton] Function error:', error);
        setLastFetchResult('error');
        toast({
          title: 'Failed to fetch timing data',
          description: error.message || 'Unknown error occurred',
          variant: 'destructive'
        });
        return;
      }

      if (data.error) {
        console.error('[TimingDataFetchButton] API error:', data.error);
        setLastFetchResult('error');
        toast({
          title: 'Failed to fetch timing data',
          description: data.error,
          variant: 'destructive'
        });
        return;
      }

      console.log('[TimingDataFetchButton] Success:', data);
      setLastFetchResult('success');
      
      toast({
        title: 'Timing data fetched successfully!',
        description: `Retrieved actual start time and duration for webinar ${webinar.id}`,
        variant: 'default'
      });

      // Call success callback to refresh the webinar data
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('[TimingDataFetchButton] Unexpected error:', error);
      setLastFetchResult('error');
      toast({
        title: 'Unexpected error',
        description: 'Failed to fetch timing data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsFetching(false);
    }
  };

  const getStatusIcon = () => {
    if (isFetching) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (lastFetchResult === 'success') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (lastFetchResult === 'error') {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  const getButtonText = () => {
    if (isFetching) return 'Fetching...';
    if (lastFetchResult === 'success') return 'Fetch Again';
    return 'Fetch Timing Data';
  };

  const getTooltipText = () => {
    if (isFetching) return 'Fetching actual timing data from Zoom...';
    if (lastFetchResult === 'success') return 'Last fetch was successful. Click to fetch again.';
    if (lastFetchResult === 'error') return 'Last fetch failed. Click to retry.';
    return 'Manually fetch actual start time and duration from Zoom API';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTimingData}
          disabled={isFetching}
          className={`gap-2 ${className}`}
        >
          {getStatusIcon()}
          {getButtonText()}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
};
