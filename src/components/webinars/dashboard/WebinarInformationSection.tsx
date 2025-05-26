
import React from 'react';
import { ZoomWebinar } from '@/hooks/zoom';
import { ZoomRecording } from '@/hooks/zoom/useZoomWebinarRecordings';
import { Separator } from '@/components/ui/separator';
import { WebinarRecordingInfo } from './WebinarRecordingInfo';
import { extractHostInfo, extractPresenterInfo, formatHostDisplay } from './utils/hostDisplayUtils';
import { formatWebinarId } from '@/lib/utils';
import { formatWebinarDate } from './utils/timeDisplayUtils';
import {
  User,
  Calendar,
  Hash,
  Users,
  Clock
} from 'lucide-react';

interface WebinarInformationSectionProps {
  webinar: ZoomWebinar;
  recordings: ZoomRecording[];
  isLoadingRecordings: boolean;
}

export const WebinarInformationSection: React.FC<WebinarInformationSectionProps> = ({
  webinar,
  recordings,
  isLoadingRecordings
}) => {
  // Extract and format host and presenter information
  const hostInfo = extractHostInfo(webinar);
  const presenterInfo = extractPresenterInfo(webinar);
  
  const formattedHost = formatHostDisplay(hostInfo);
  const formattedPresenter = formatHostDisplay(presenterInfo);
  
  // Get panelists from webinar data
  const panelists = Array.isArray(webinar.panelists) ? webinar.panelists : [];
  
  // Get webinar timezone, fallback to UTC if not available
  const webinarTimezone = webinar.timezone || 'UTC';
  
  // Format webinar date in the webinar's timezone
  const webinarDate = formatWebinarDate(webinar.start_time, webinarTimezone);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">Webinar Information</h3>
      <Separator />
      
      <div className="grid grid-cols-[24px_1fr] gap-x-2 gap-y-2 items-start">
        <User className="h-4 w-4 text-muted-foreground mt-1" />
        <div>
          <span className="font-medium">Webinar Host:</span> {formattedHost}
        </div>
        
        <Hash className="h-4 w-4 text-muted-foreground mt-1" />
        <div>
          <span className="font-medium">Webinar ID:</span> {formatWebinarId(webinar.id)}
        </div>
        
        <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
        <div>
          <span className="font-medium">Webinar Date:</span> {webinarDate}
        </div>
        
        <Clock className="h-4 w-4 text-muted-foreground mt-1" />
        <div>
          <span className="font-medium">Timezone:</span> {webinar.timezone || 'Not specified'}
        </div>
        
        <User className="h-4 w-4 text-muted-foreground mt-1" />
        <div>
          <span className="font-medium">Presenter:</span> {formattedPresenter}
        </div>
        
        <Users className="h-4 w-4 text-muted-foreground mt-1" />
        <div>
          <span className="font-medium">Panelists:</span>
          {panelists.length > 0 ? (
            <div className="mt-1">
              {panelists.map((panelist: any, index: number) => (
                <div key={index} className="ml-4">
                  • {panelist.name || panelist.email || `Panelist ${index + 1}`}
                  {panelist.email && panelist.name && (
                    <span className="ml-1">({panelist.email})</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span> No panelists assigned</span>
          )}
        </div>
        
        <WebinarRecordingInfo 
          webinar={webinar}
          recordings={recordings}
          isLoadingRecordings={isLoadingRecordings}
        />
      </div>
    </div>
  );
};
