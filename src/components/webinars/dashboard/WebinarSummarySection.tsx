
import React, { useState } from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { Separator } from '@/components/ui/separator';
import { ActualTimingButton } from './ActualTimingButton';
import { 
  getScheduledStartTimeDisplay, 
  getActualStartTimeDisplay,
  getScheduledDurationDisplay,
  getActualDurationDisplay
} from './utils/timeDisplayUtils';
import {
  Clock,
  Activity,
  UserCheck,
  UserX,
  UserPlus,
  Eye,
  Users
} from 'lucide-react';

interface WebinarSummarySectionProps {
  webinar: ZoomWebinar;
  participants: ZoomParticipants;
}

export const WebinarSummarySection: React.FC<WebinarSummarySectionProps> = ({
  webinar,
  participants
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Calculate registration stats
  const totalRegistered = participants.registrants.length;
  const totalCancelled = participants.registrants.filter(r => r.status === 'cancelled').length;
  const totalApproved = participants.registrants.filter(r => r.status === 'approved').length;
  const totalDenied = participants.registrants.filter(r => r.status === 'denied').length;
  
  // Calculate viewer stats
  const uniqueViewers = new Set(participants.attendees.map(a => a.user_email)).size;
  const totalUsers = participants.attendees.length;
  
  // Get webinar timezone, fallback to UTC if not available
  const webinarTimezone = webinar.timezone || 'UTC';
  
  // Get time and duration display info (force refresh by using refreshKey)
  const scheduledStartTimeInfo = getScheduledStartTimeDisplay(webinar, webinarTimezone);
  const actualStartTimeInfo = getActualStartTimeDisplay(webinar, webinarTimezone);
  const scheduledDurationInfo = getScheduledDurationDisplay(webinar);
  const actualDurationInfo = getActualDurationDisplay(webinar);
  
  // Max concurrent views
  const maxConcurrentViews = webinar.max_concurrent_views || 'Not available';
  
  // Check if this is a completed webinar
  const isCompleted = webinar.status === 'ended' || webinar.status === 'aborted';
  const hasActualData = webinar.actual_start_time || webinar.actual_duration;

  const handleDataFetched = () => {
    // Force a re-render to show updated timing data
    setRefreshKey(prev => prev + 1);
    // Also trigger a page refresh after a short delay to ensure data is updated
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
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
      
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Session Summary</h3>
        {isCompleted && !hasActualData && (
          <ActualTimingButton 
            webinar={webinar} 
            onDataFetched={handleDataFetched}
          />
        )}
      </div>
      <Separator />
      
      <div className="grid grid-cols-[24px_1fr] gap-x-2 gap-y-2 items-start">
        <Clock className="h-4 w-4 text-muted-foreground mt-1" />
        <div>
          <span className="font-medium">{scheduledStartTimeInfo.label}</span> {scheduledStartTimeInfo.time}
        </div>
        
        {actualStartTimeInfo && (
          <>
            <Clock className="h-4 w-4 text-green-600 mt-1" />
            <div>
              <span className="font-medium">{actualStartTimeInfo.label}</span> {actualStartTimeInfo.time}
            </div>
          </>
        )}
        
        <Activity className="h-4 w-4 text-muted-foreground mt-1" />
        <div>
          <span className="font-medium">{scheduledDurationInfo.label}</span> {scheduledDurationInfo.duration}
        </div>
        
        {actualDurationInfo && (
          <>
            <Activity className="h-4 w-4 text-green-600 mt-1" />
            <div>
              <span className="font-medium">{actualDurationInfo.label}</span> {actualDurationInfo.duration}
            </div>
          </>
        )}
        
        {isCompleted && !hasActualData && (
          <div className="col-span-2 text-sm text-muted-foreground italic">
            Actual timing data not available. Click "Get Timing" to fetch it.
          </div>
        )}
        
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
  );
};
