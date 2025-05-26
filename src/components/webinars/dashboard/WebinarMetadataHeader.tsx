import React, { useEffect } from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { useZoomWebinarRecordings } from '@/hooks/zoom/useZoomWebinarRecordings';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { WebinarRecordingInfo } from './WebinarRecordingInfo';
import { extractHostInfo, extractPresenterInfo, formatHostDisplay } from './utils/hostDisplayUtils';
import { formatWebinarId } from '@/lib/utils';
import {
  User,
  Calendar,
  Hash,
  Users,
  Clock,
  Activity,
  UserCheck,
  UserX,
  UserPlus,
  Eye
} from 'lucide-react';

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
  
  // Calculate registration stats
  const totalRegistered = participants.registrants.length;
  const totalCancelled = participants.registrants.filter(r => r.status === 'cancelled').length;
  const totalApproved = participants.registrants.filter(r => r.status === 'approved').length;
  const totalDenied = participants.registrants.filter(r => r.status === 'denied').length;
  
  // Calculate viewer stats
  const uniqueViewers = new Set(participants.attendees.map(a => a.user_email)).size;
  const totalUsers = participants.attendees.length;
  
  // Extract and format host and presenter information
  const hostInfo = extractHostInfo(webinar);
  const presenterInfo = extractPresenterInfo(webinar);
  
  const formattedHost = formatHostDisplay(hostInfo);
  const formattedPresenter = formatHostDisplay(presenterInfo);
  
  // Get panelists from webinar data - now properly typed
  const panelists = Array.isArray(webinar.panelists) ? webinar.panelists : [];
  console.log('[WebinarMetadataHeader] Processed panelists:', panelists);
  
  // Format webinar date
  const webinarDate = webinar.start_time ? 
    format(parseISO(webinar.start_time), 'EEEE, MMMM d, yyyy • h:mm a') : 
    'Date not set';
  
  // Actual start time and duration
  const actualStart = webinar.actual_start_time ? 
    format(parseISO(webinar.actual_start_time), 'h:mm a') : 
    format(parseISO(webinar.start_time), 'h:mm a');
  const actualDuration = webinar.actual_duration || webinar.duration;
  
  // Max concurrent views
  const maxConcurrentViews = webinar.max_concurrent_views || 'Not available';

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Basic webinar information */}
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
          
          {/* Column 2: Registration and viewer statistics */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Registration Summary</h3>
            <Separator />
            
            <div className="grid grid-cols-[24px_1fr] gap-x-2 gap-y-2 items-start">
              <UserPlus className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Total Registered:</span> {totalRegistered}
              </div>
              
              <UserX className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Total Cancelled:</span> {totalCancelled}
              </div>
              
              <UserCheck className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Total Approved:</span> {totalApproved}
              </div>
              
              <UserX className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Total Denied:</span> {totalDenied}
              </div>
            </div>
            
            <h3 className="text-lg font-medium mt-4">Session Summary</h3>
            <Separator />
            
            <div className="grid grid-cols-[24px_1fr] gap-x-2 gap-y-2 items-start">
              <Clock className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Actual Start:</span> {actualStart}
              </div>
              
              <Clock className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Actual Duration:</span> {actualDuration} minutes
              </div>
              
              <Eye className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Unique Viewers:</span> {uniqueViewers}
              </div>
              
              <Users className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Total Users:</span> {totalUsers}
              </div>
              
              <Activity className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Max Concurrent Views:</span> {maxConcurrentViews}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
