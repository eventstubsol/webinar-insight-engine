
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, PlayCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { DurationService } from '@/hooks/zoom/services/durationService';

export const BulkDurationEnhancement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [missingDurations, setMissingDurations] = useState<any[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  
  // Check for missing durations on mount
  useEffect(() => {
    if (user?.id) {
      checkMissingDurations();
    }
  }, [user?.id]);
  
  const checkMissingDurations = async () => {
    if (!user?.id) return;
    
    try {
      const missing = await DurationService.checkMissingDurations(user.id);
      setMissingDurations(missing);
    } catch (error) {
      console.error('Error checking missing durations:', error);
    }
  };
  
  const handleBulkEnhancement = async () => {
    setIsLoading(true);
    try {
      const result = await DurationService.enhanceAllMissingDurations();
      setLastResult(result);
      
      toast({
        title: 'Bulk enhancement completed',
        description: `Enhanced ${result.results?.enhanced || 0} out of ${result.results?.processed || 0} webinars`,
        variant: result.results?.enhanced > 0 ? 'default' : 'destructive'
      });
      
      // Refresh missing durations list
      await checkMissingDurations();
      
    } catch (error) {
      console.error('Error in bulk enhancement:', error);
      toast({
        title: 'Bulk enhancement failed',
        description: error.message || 'Failed to enhance duration data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (missingDurations.length === 0) {
    return null; // Don't show if no missing durations
  }
  
  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-orange-500" />
          Missing Duration Data
        </CardTitle>
        <CardDescription>
          {missingDurations.length} completed webinars are missing duration information
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Webinars missing duration:</span>
          <Badge variant="secondary">
            {missingDurations.length}
          </Badge>
        </div>
        
        {/* Enhancement Button */}
        <Button
          onClick={handleBulkEnhancement}
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          <PlayCircle size={16} className="mr-2" />
          {isLoading ? 'Enhancing All Durations...' : 'Fix All Missing Durations'}
        </Button>
        
        {/* Progress/Results */}
        {lastResult && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Last Enhancement Results:</div>
            <div className="text-xs space-y-1">
              <div>Processed: {lastResult.results?.processed || 0}</div>
              <div>Enhanced: {lastResult.results?.enhanced || 0}</div>
              <div>Errors: {lastResult.results?.errors?.length || 0}</div>
            </div>
            
            {lastResult.results?.durations_found?.length > 0 && (
              <div className="text-xs">
                <div className="font-medium">Found durations:</div>
                {lastResult.results.durations_found.slice(0, 3).map((item: any, idx: number) => (
                  <div key={idx} className="text-muted-foreground">
                    • {item.topic}: {item.duration}min ({item.method})
                  </div>
                ))}
                {lastResult.results.durations_found.length > 3 && (
                  <div className="text-muted-foreground">
                    ... and {lastResult.results.durations_found.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Missing Webinars List (first few) */}
        <div className="text-xs">
          <div className="font-medium mb-1">Missing duration webinars:</div>
          {missingDurations.slice(0, 5).map((webinar, idx) => (
            <div key={idx} className="text-muted-foreground truncate">
              • {webinar.topic}
            </div>
          ))}
          {missingDurations.length > 5 && (
            <div className="text-muted-foreground">
              ... and {missingDurations.length - 5} more
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
