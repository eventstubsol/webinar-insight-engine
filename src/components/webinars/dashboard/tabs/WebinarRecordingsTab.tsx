
import React from 'react';
import { ZoomWebinar } from '@/hooks/zoom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { useZoomWebinarRecordings } from '@/hooks/zoom/useZoomWebinarRecordings';
import { RecordingsPanel } from '../recordings/RecordingsPanel';
import { ZoomDataService } from '@/hooks/zoom/services/ZoomDataService';
import { toast } from '@/hooks/use-toast';

interface WebinarRecordingsTabProps {
  webinar: ZoomWebinar;
}

export const WebinarRecordingsTab: React.FC<WebinarRecordingsTabProps> = ({
  webinar
}) => {
  const { 
    recordings, 
    totalRecordings,
    totalDuration,
    isLoading, 
    isRefetching,
    refetch,
    error 
  } = useZoomWebinarRecordings(webinar.webinar_id);

  const handleSyncRecordings = async () => {
    try {
      toast({
        title: "Syncing recordings",
        description: "Retrieving the latest recording data..."
      });
      
      await ZoomDataService.syncAllWebinarData(webinar.user_id, webinar.webinar_id);
      
      // Refetch recordings after sync
      await refetch();
      
      toast({
        title: "Recordings synced",
        description: "Recording data has been updated"
      });
    } catch (err) {
      console.error("Error syncing recording data:", err);
      toast({
        title: "Sync failed",
        description: "Could not sync recording data",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Webinar Recordings</CardTitle>
            <CardDescription>
              Access and manage recordings for this webinar
              {totalRecordings > 0 && ` (${totalRecordings} recordings, ${Math.round(totalDuration / 60)} minutes total)`}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncRecordings} 
            disabled={isRefetching}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Syncing...' : 'Sync Recordings'}
          </Button>
        </CardHeader>
        <CardContent>
          <RecordingsPanel 
            recordings={recordings} 
            isLoading={isLoading} 
          />
        </CardContent>
      </Card>
    </div>
  );
};
