
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, LoaderCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { zoomApiClient } from '@/hooks/zoom/services/zoomApiClient';

interface SyncTimingDataButtonProps {
  onSyncComplete?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export const SyncTimingDataButton: React.FC<SyncTimingDataButtonProps> = ({
  onSyncComplete,
  variant = 'outline',
  size = 'default',
  className
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSyncTimingData = async () => {
    setIsLoading(true);
    
    const loadingToast = toast({
      title: "Syncing timing data",
      description: "Fetching actual start times and durations from Zoom...",
    });

    try {
      const result = await zoomApiClient.syncTimingData();
      
      // Dismiss loading toast
      loadingToast.dismiss();
      
      if (result.success) {
        toast({
          title: "Timing data synced",
          description: `Updated ${result.updated} of ${result.total} webinars with actual timing data`,
          variant: 'default'
        });
        
        // Show errors if any
        if (result.errors && result.errors.length > 0) {
          console.warn('Some webinars had timing sync errors:', result.errors);
          toast({
            title: "Partial sync",
            description: `${result.errors.length} webinars could not be updated. Check console for details.`,
            variant: 'warning'
          });
        }
        
        // Trigger refresh if callback provided
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        toast({
          title: "Sync failed",
          description: result.error || 'Could not sync timing data',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[SyncTimingDataButton] Error syncing timing data:', error);
      
      // Dismiss loading toast
      loadingToast.dismiss();
      
      toast({
        title: "Sync failed",
        description: error.message || 'Could not sync timing data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleSyncTimingData} 
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Clock className="h-4 w-4 mr-2" />
      )}
      Sync Timing Data
    </Button>
  );
};
