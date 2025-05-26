
import React from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { Separator } from '@/components/ui/separator';
import { 
  getScheduledTimeDisplay, 
  getActualTimeDisplay, 
  getScheduledDurationDisplay, 
  getActualDurationDisplay,
  getTimingDataStatus
} from './utils/timeDisplayUtils';
import {
  Clock,
  Activity,
  UserCheck,
  UserX,
  UserPlus,
  Eye,
  Users,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface WebinarSummarySectionProps {
  webinar: ZoomWebinar;
  participants: ZoomParticipants;
}

export const WebinarSummarySection: React.FC<WebinarSummarySectionProps> = ({
  webinar,
  participants
}) => {
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
  
  // Get time and duration display info
  const scheduledTimeInfo = getScheduledTimeDisplay(webinar, webinarTimezone);
  const actualTimeInfo = getActualTimeDisplay(webinar, webinarTimezone);
  const scheduledDurationInfo = getScheduledDurationDisplay(webinar);
  const actualDurationInfo = getActualDurationDisplay(webinar);
  
  // Get timing data status for better UI feedback
  const timingStatus = getTimingDataStatus(webinar);
  
  // Max concurrent views
  const maxConcurrentViews = webinar.max_concurrent_views || 'Not available';

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
      
      <h3 className="text-lg font-medium mt-4">Session Summary</h3>
      <Separator />
      
      <div className="grid grid-cols-[24px_1fr] gap-x-2 gap-y-2 items-start">
        {scheduledTimeInfo && (
          <>
            <Clock className="h-4 w-4 text-muted-foreground mt-1" />
            <div className={scheduledTimeInfo.isDataMissing ? "text-muted-foreground" : ""}>
              <span className="font-medium">{scheduledTimeInfo.label}</span> {scheduledTimeInfo.time}
            </div>
          </>
        )}
        
        {actualTimeInfo && (
          <>
            {actualTimeInfo.isDataMissing ? (
              timingStatus === 'no_uuid' ? (
                <AlertTriangle className="h-4 w-4 text-red-500 mt-1" />
              ) : (
                <RefreshCw className="h-4 w-4 text-amber-500 mt-1" />
              )
            ) : (
              <Clock className="h-4 w-4 text-green-600 mt-1" />
            )}
            <div className={
              actualTimeInfo.isDataMissing 
                ? timingStatus === 'no_uuid' 
                  ? "text-red-600" 
                  : "text-amber-600"
                : "text-green-600"
            }>
              <span className="font-medium">{actualTimeInfo.label}</span> {actualTimeInfo.time}
            </div>
          </>
        )}
        
        {scheduledDurationInfo && (
          <>
            <Clock className="h-4 w-4 text-muted-foreground mt-1" />
            <div className={scheduledDurationInfo.isDataMissing ? "text-muted-foreground" : ""}>
              <span className="font-medium">{scheduledDurationInfo.label}</span> {scheduledDurationInfo.duration}
            </div>
          </>
        )}
        
        {actualDurationInfo && (
          <>
            {actualDurationInfo.isDataMissing ? (
              timingStatus === 'no_uuid' ? (
                <AlertTriangle className="h-4 w-4 text-red-500 mt-1" />
              ) : (
                <RefreshCw className="h-4 w-4 text-amber-500 mt-1" />
              )
            ) : (
              <Clock className="h-4 w-4 text-green-600 mt-1" />
            )}
            <div className={
              actualDurationInfo.isDataMissing 
                ? timingStatus === 'no_uuid' 
                  ? "text-red-600" 
                  : "text-amber-600"
                : "text-green-600"
            }>
              <span className="font-medium">{actualDurationInfo.label}</span> {actualDurationInfo.duration}
            </div>
          </>
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
      
      {/* Show timing data status hint */}
      {timingStatus === 'missing' && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center gap-2 text-amber-700">
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm font-medium">Actual timing data is being processed or unavailable</span>
          </div>
          <p className="text-sm text-amber-600 mt-1">
            This webinar has ended but actual start/duration data is not yet available. Try syncing the webinar to fetch this data.
          </p>
        </div>
      )}
      
      {timingStatus === 'no_uuid' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Actual timing data unavailable</span>
          </div>
          <p className="text-sm text-red-600 mt-1">
            This webinar is missing required identifier data and cannot retrieve actual timing information.
          </p>
        </div>
      )}
    </div>
  );
};
