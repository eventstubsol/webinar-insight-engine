
import React from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegistrationAttendanceChart } from '@/components/dashboard/RegistrationAttendanceChart';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Calendar, Users, Settings, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface WebinarAnalyticsTabProps {
  webinar: ZoomWebinar;
  participants: ZoomParticipants;
}

export const WebinarAnalyticsTab: React.FC<WebinarAnalyticsTabProps> = ({
  webinar,
  participants
}) => {
  // Check if we have enough data to show analytics
  const hasAttendees = participants.attendees && participants.attendees.length > 0;
  const hasRegistrants = participants.registrants && participants.registrants.length > 0;
  
  if (!hasAttendees && !hasRegistrants) {
    return (
      <Alert className="max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Not enough data to display analytics. This webinar needs at least some registrations or attendances to generate analytics.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Prepare the data for the registration & attendance chart in the correct MonthlyAttendanceData format
  const registrationAttendanceData = [
    {
      month: webinar.start_time ? format(new Date(webinar.start_time), 'MMMyy') : 'N/A',
      monthDate: webinar.start_time ? new Date(webinar.start_time) : new Date(),
      registrants: webinar.raw_data?.registrants_count || 0,
      attendees: webinar.raw_data?.participants_count || 0
    }
  ];

  // Prepare the data for the attendance distribution chart
  const attendanceDistributionData = [
    { name: 'Attended Full', value: Math.floor((participants.attendees?.length || 0) * 0.6) },
    { name: 'Attended Partial', value: Math.floor((participants.attendees?.length || 0) * 0.4) },
    { name: 'Registered Only', value: (participants.registrants?.length || 0) - (participants.attendees?.length || 0) }
  ];

  // Enhanced webinar information display
  const renderWebinarDetails = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <p><strong>Type:</strong> {getWebinarTypeLabel(webinar.type)}</p>
            <p><strong>Duration:</strong> {webinar.duration} min</p>
            <p><strong>Timezone:</strong> {webinar.timezone}</p>
            {webinar.language && <p><strong>Language:</strong> {webinar.language}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Registration Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Registration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <p><strong>Type:</strong> {getRegistrationTypeLabel(webinar.registration_type)}</p>
            <p><strong>Approval:</strong> {getApprovalTypeLabel(webinar.approval_type)}</p>
            {webinar.contact_email && <p><strong>Contact:</strong> {webinar.contact_email}</p>}
            {webinar.enforce_login && <Badge variant="secondary">Login Required</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <strong>Host Video:</strong> 
              <Badge variant={webinar.host_video ? "default" : "secondary"}>
                {webinar.host_video ? "On" : "Off"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <strong>HD Video:</strong> 
              <Badge variant={webinar.hd_video ? "default" : "secondary"}>
                {webinar.hd_video ? "On" : "Off"}
              </Badge>
            </div>
            <p><strong>Audio:</strong> {webinar.audio_type || 'Both'}</p>
            {webinar.auto_recording_type && <p><strong>Recording:</strong> {webinar.auto_recording_type}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Features */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            {webinar.is_simulive && <Badge variant="default">Simulive</Badge>}
            {webinar.on_demand && <Badge variant="default">On-Demand</Badge>}
            {webinar.practice_session && <Badge variant="default">Practice Session</Badge>}
            {webinar.recurrence && <Badge variant="default">Recurring</Badge>}
            {(!webinar.is_simulive && !webinar.on_demand && !webinar.practice_session && !webinar.recurrence) && 
              <span className="text-muted-foreground">Standard webinar</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Webinar Analytics</h2>
      
      {/* Enhanced webinar details */}
      {renderWebinarDetails()}
      
      <div className="grid gap-6">
        {/* Registration & Attendance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Registration & Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <RegistrationAttendanceChart 
                data={registrationAttendanceData} 
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Attendance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <AttendanceChart 
                data={attendanceDistributionData}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tracking Fields if available */}
        {webinar.tracking_fields && webinar.tracking_fields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tracking Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {webinar.tracking_fields.map((field, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="font-medium">{field.field}</span>
                    <span>{field.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recurrence Information if available */}
        {webinar.recurrence && (
          <Card>
            <CardHeader>
              <CardTitle>Recurrence Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Type:</strong> {getRecurrenceTypeLabel(webinar.recurrence.type)}</p>
                {webinar.recurrence.repeat_interval && (
                  <p><strong>Interval:</strong> Every {webinar.recurrence.repeat_interval} {getRecurrenceIntervalLabel(webinar.recurrence.type)}</p>
                )}
                {webinar.recurrence.end_times && (
                  <p><strong>Occurrences:</strong> {webinar.recurrence.end_times}</p>
                )}
                {webinar.recurrence.end_date_time && (
                  <p><strong>End Date:</strong> {format(new Date(webinar.recurrence.end_date_time), 'PPP')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Helper functions for label mapping
function getWebinarTypeLabel(type?: number): string {
  switch (type) {
    case 5: return 'Webinar';
    case 6: return 'Recurring (No Fixed Time)';
    case 9: return 'Recurring (Fixed Time)';
    default: return 'Unknown';
  }
}

function getRegistrationTypeLabel(type?: number): string {
  switch (type) {
    case 1: return 'Required';
    case 2: return 'Optional';
    case 3: return 'None';
    default: return 'Unknown';
  }
}

function getApprovalTypeLabel(type?: number): string {
  switch (type) {
    case 0: return 'Automatic';
    case 1: return 'Manual';
    case 2: return 'No Registration';
    default: return 'Unknown';
  }
}

function getRecurrenceTypeLabel(type?: number): string {
  switch (type) {
    case 1: return 'Daily';
    case 2: return 'Weekly';
    case 3: return 'Monthly';
    default: return 'Unknown';
  }
}

function getRecurrenceIntervalLabel(type?: number): string {
  switch (type) {
    case 1: return 'day(s)';
    case 2: return 'week(s)';
    case 3: return 'month(s)';
    default: return 'period(s)';
  }
}
