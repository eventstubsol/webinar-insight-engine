
import React from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { Separator } from '@/components/ui/separator';
import { 
  getScheduledTimeDisplay, 
  getActualTimeDisplay, 
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
            <div>
              <span className="font-medium">{scheduledTimeInfo.label}</span> {scheduledTimeInfo.time}
            </div>
          </>
        )}
        
        {actualTimeInfo && (
          <>
            <Clock className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <span className="font-medium">{actualTimeInfo.label}</span> {actualTimeInfo.time}
            </div>
          </>
        )}
        
        {scheduledDurationInfo && (
          <>
            <Clock className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <span className="font-medium">{scheduledDurationInfo.label}</span> {scheduledDurationInfo.duration}
            </div>
          </>
        )}
        
        {actualDurationInfo && (
          <>
            <Clock className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
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
    </div>
  );
};
