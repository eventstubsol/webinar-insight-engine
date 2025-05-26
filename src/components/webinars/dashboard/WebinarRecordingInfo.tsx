
import React, { useState } from 'react';
import { ZoomWebinar } from '@/hooks/zoom';
import { ZoomRecording, useZoomWebinarRecordings } from '@/hooks/zoom/useZoomWebinarRecordings';
import { Video, Key } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RecordingLink } from './recording/RecordingLink';
import { RecordingPassword } from './recording/RecordingPassword';
import { getRecordingStatus } from './recording/recordingStatusUtils';

interface WebinarRecordingInfoProps {
  webinar: ZoomWebinar;
  recordings: ZoomRecording[];
  isLoadingRecordings: boolean;
}

export const WebinarRecordingInfo: React.FC<WebinarRecordingInfoProps> = ({ 
  webinar, 
  recordings, 
  isLoadingRecordings 
}) => {
  const { refreshRecordings } = useZoomWebinarRecordings(webinar.id);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshRecordings = async () => {
    setIsRefreshing(true);
    try {
      await refreshRecordings();
      toast({
        title: 'Recordings refreshed',
        description: 'Recording data has been updated from Zoom',
      });
    } catch (error) {
      toast({
        title: 'Refresh failed',
        description: 'Could not refresh recording data',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const recordingStatus = getRecordingStatus(webinar, recordings, isLoadingRecordings, isRefreshing);

  return (
    <>
      <Video className="h-4 w-4 text-muted-foreground mt-1" />
      <div>
        <span className="font-medium">Recording Link:</span>{' '}
        <RecordingLink 
          recordingStatus={recordingStatus}
          isRefreshing={isRefreshing}
          onRefresh={handleRefreshRecordings}
        />
      </div>
      
      <Key className="h-4 w-4 text-muted-foreground mt-1" />
      <div>
        <span className="font-medium">Recording Password:</span>{' '}
        <RecordingPassword recordingStatus={recordingStatus} />
      </div>
    </>
  );
};
