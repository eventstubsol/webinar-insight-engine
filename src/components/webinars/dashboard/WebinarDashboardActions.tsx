
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ZoomDataService } from '@/hooks/zoom/services/ZoomDataService';

interface WebinarDashboardActionsProps {
  webinarId: string;
  userId: string;
  onRefresh: () => Promise<void>;
  isRefetching: boolean;
}

export const WebinarDashboardActions: React.FC<WebinarDashboardActionsProps> = ({ 
  webinarId, 
  userId, 
  onRefresh, 
  isRefetching 
}) => {
  const { toast } = useToast();
  
  // Function to sync all extended data
  const syncAllExtendedData = async () => {
    if (!webinarId) return;
    
    try {
      toast({
        title: "Syncing extended data",
        description: "Please wait while we fetch Q&A, polls, and engagement data..."
      });
      
      await ZoomDataService.syncAllWebinarData(userId, webinarId);
      
      await onRefresh();
      
      toast({
        title: "Extended data synced",
        description: "Q&A, polls, and engagement data has been updated"
      });
    } catch (error) {
      console.error("Error syncing extended data:", error);
      toast({
        title: "Sync failed",
        description: "Could not sync extended webinar data. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={syncAllExtendedData}
        className="flex items-center gap-1"
        disabled={isRefetching}
      >
        <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        Sync Extended Data
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRefresh}
        className="flex items-center gap-1"
        disabled={isRefetching}
      >
        <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        Refresh Data
      </Button>
    </div>
  );
};
