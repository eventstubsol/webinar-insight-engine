
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DurationService } from '@/hooks/zoom/services/durationService';
import { ZoomWebinar } from '@/hooks/zoom';

interface DurationDebugPanelProps {
  webinar: ZoomWebinar;
  onDurationEnhanced?: () => void;
}

export const DurationDebugPanel: React.FC<DurationDebugPanelProps> = ({
  webinar,
  onDurationEnhanced
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();
  
  const hasDuration = webinar.actual_duration !== null && webinar.actual_duration !== undefined;
  const isCompleted = webinar.status === 'ended' || webinar.status === 'stopped';
  
  const handleEnhanceDuration = async () => {
    if (!isCompleted) {
      toast({
        title: 'Cannot enhance duration',
        description: 'Duration can only be enhanced for completed webinars',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await DurationService.enhanceWebinarDuration(webinar.id.toString());
      setLastResult(result);
      
      if (result.results?.enhanced > 0) {
        toast({
          title: 'Duration enhanced',
          description: `Successfully loaded duration data: ${result.results.durations_found[0]?.duration} minutes`,
          variant: 'default'
        });
        onDurationEnhanced?.();
      } else {
        toast({
          title: 'No duration data found',
          description: result.results?.errors?.[0] || 'Could not find duration data from Zoom API',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error enhancing duration:', error);
      toast({
        title: 'Enhancement failed',
        description: error.message || 'Failed to enhance duration data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock size={16} />
          Duration Data Status
        </CardTitle>
        <CardDescription>
          Debug and enhance webinar duration information
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Duration Available:</span>
          <Badge variant={hasDuration ? 'default' : 'secondary'} className="flex items-center gap-1">
            {hasDuration ? (
              <>
                <CheckCircle size={12} />
                {webinar.actual_duration} min
              </>
            ) : (
              <>
                <AlertCircle size={12} />
                Missing
              </>
            )}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Webinar Status:</span>
          <Badge variant={isCompleted ? 'default' : 'outline'}>
            {webinar.status}
          </Badge>
        </div>
        
        {/* Enhancement Button */}
        {!hasDuration && isCompleted && (
          <Button
            onClick={handleEnhanceDuration}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            <Play size={16} className="mr-2" />
            {isLoading ? 'Loading Duration...' : 'Load Duration Data'}
          </Button>
        )}
        
        {!isCompleted && (
          <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
            Duration data is only available for completed webinars
          </div>
        )}
        
        {/* Last Result Display */}
        {lastResult && (
          <div className="text-xs bg-muted p-2 rounded">
            <div className="font-medium mb-1">Last Enhancement Result:</div>
            <div>Processed: {lastResult.results?.processed || 0}</div>
            <div>Enhanced: {lastResult.results?.enhanced || 0}</div>
            {lastResult.results?.durations_found?.length > 0 && (
              <div>Method: {lastResult.results.durations_found[0].method}</div>
            )}
            {lastResult.results?.errors?.length > 0 && (
              <div className="text-red-600 mt-1">
                Error: {lastResult.results.errors[0]}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
