
import React, { useEffect } from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { useZoomWebinarRecordings } from '@/hooks/zoom/useZoomWebinarRecordings';
import { Card, CardContent } from '@/components/ui/card';
import { WebinarInformationSection } from './WebinarInformationSection';
import { WebinarSummarySection } from './WebinarSummarySection';
import { WebinarSyncButton } from '../WebinarSyncButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Sparkles } from 'lucide-react';

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

  // Check if webinar has been enhanced
  const isEnhanced = webinar._enhanced || (webinar.host_email && webinar.host_name);
  const needsEnhancement = !isEnhanced;

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        {needsEnhancement && (
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="flex items-center justify-between">
                <span>This webinar has basic data only. Enhance it to see host details, panelists, and participant information.</span>
                <WebinarSyncButton 
                  webinarId={webinar.id} 
                  mode="enhance" 
                  size="sm"
                  className="ml-4"
                />
              </div>
            </AlertDescription>
          </Alert>
        )}
        
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
        
        {isEnhanced && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Sparkles className="h-4 w-4" />
              <span>Enhanced with detailed host, panelist, and participant data</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
