
import React, { useEffect } from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { useZoomWebinarRecordings } from '@/hooks/zoom/useZoomWebinarRecordings';
import { Card, CardContent } from '@/components/ui/card';
import { WebinarInformationSection } from './WebinarInformationSection';
import { WebinarSummarySection } from './WebinarSummarySection';

interface WebinarMetadataHeaderProps {
  webinar: ZoomWebinar;
  participants: ZoomParticipants;
}

export const WebinarMetadataHeader: React.FC<WebinarMetadataHeaderProps> = ({ webinar, participants }) => {
  // Debug logging
  console.log('[WebinarMetadataHeader] Webinar data:', webinar);
  console.log('[WebinarMetadataHeader] Panelists:', webinar.panelists);
  
  // Fetch recordings data
  const { recordings, isLoading: isLoadingRecordings, refreshRecordings } = useZoomWebinarRecordings(webinar.id);
  
  // Auto-fetch recordings for completed webinars when component mounts
  useEffect(() => {
    const isCompleted = webinar.status === 'ended' || webinar.status === 'aborted';
    if (isCompleted && recordings.length === 0 && !isLoadingRecordings) {
      console.log('[WebinarMetadataHeader] Auto-fetching recordings for completed webinar:', webinar.id);
      refreshRecordings().catch(error => {
        console.error('[WebinarMetadataHeader] Failed to auto-fetch recordings:', error);
      });
    }
  }, [webinar.status, webinar.id, recordings.length, isLoadingRecordings, refreshRecordings]);

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Basic webinar information */}
          <WebinarInformationSection 
            webinar={webinar}
            recordings={recordings}
            isLoadingRecordings={isLoadingRecordings}
          />
          
          {/* Column 2: Registration and viewer statistics */}
          <WebinarSummarySection 
            webinar={webinar}
            participants={participants}
          />
        </div>
      </CardContent>
    </Card>
  );
};
