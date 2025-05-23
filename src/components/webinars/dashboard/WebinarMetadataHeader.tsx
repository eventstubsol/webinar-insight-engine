
import React from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import {
  User,
  Calendar,
  Hash,
  Video,
  Key,
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
  // Calculate registration stats
  const totalRegistered = participants.registrants.length;
  const totalCancelled = participants.registrants.filter(r => r.status === 'cancelled').length;
  const totalApproved = participants.registrants.filter(r => r.status === 'approved').length;
  const totalDenied = participants.registrants.filter(r => r.status === 'denied').length;
  
  // Calculate viewer stats
  const uniqueViewers = new Set(participants.attendees.map(a => a.user_email)).size;
  const totalUsers = participants.attendees.length;
  
  // Extract presenters and panelists from webinar data if available
  const presenter = webinar.raw_data?.alternative_host || webinar.host_email;
  const panelists = webinar.raw_data?.panelists || [];
  
  // Format webinar date
  const webinarDate = webinar.start_time ? 
    format(parseISO(webinar.start_time), 'EEEE, MMMM d, yyyy • h:mm a') : 
    'Date not set';

  // Recording details (placeholder, as this information may not be available in current data model)
  const recordingLink = webinar.raw_data?.recording_url || 'Not available';
  const recordingPassword = webinar.raw_data?.recording_password || 'Not available';
  
  // Actual start time and duration
  const actualStart = webinar.raw_data?.actual_start_time ? 
    format(parseISO(webinar.raw_data.actual_start_time), 'h:mm a') : 
    format(parseISO(webinar.start_time), 'h:mm a');
  const actualDuration = webinar.raw_data?.actual_duration || webinar.duration;
  
  // Max concurrent views (placeholder, as this information may not be available in current data model)
  const maxConcurrentViews = webinar.raw_data?.max_concurrent_views || 'Not available';

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
                <span className="font-medium">Webinar Host:</span> {webinar.host_email}
              </div>
              
              <Hash className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Webinar ID:</span> {webinar.id}
              </div>
              
              <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Webinar Date:</span> {webinarDate}
              </div>
              
              <User className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Presenter:</span> {presenter}
              </div>
              
              {panelists.length > 0 ? (
                panelists.map((panelist: any, index: number) => (
                  <React.Fragment key={index}>
                    <Users className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <span className="font-medium">Panelist:</span> {panelist.name || panelist.email || 'Unknown'}
                    </div>
                  </React.Fragment>
                ))
              ) : (
                <>
                  <Users className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <span className="font-medium">Panelist:</span> None
                  </div>
                </>
              )}
              
              <Video className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Recording Link:</span> {recordingLink}
              </div>
              
              <Key className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Recording Password:</span> {recordingPassword}
              </div>
            </div>
          </div>
          
          {/* Column 2: Registration and viewer statistics */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Registration Stats</h3>
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
              
              <Clock className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Actual Start:</span> {actualStart}
              </div>
              
              <Clock className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <span className="font-medium">Actual Duration:</span> {actualDuration} minutes
              </div>
            </div>
            
            <h3 className="text-lg font-medium mt-4">Viewer Stats</h3>
            <Separator />
            
            <div className="grid grid-cols-[24px_1fr] gap-x-2 gap-y-2 items-start">
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
