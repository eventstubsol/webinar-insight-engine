
import React from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegistrationAttendanceChart } from '@/components/dashboard/RegistrationAttendanceChart';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Webinar Analytics</h2>
      
      <div className="grid gap-6">
        {/* Registration & Attendance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Registration & Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <RegistrationAttendanceChart webinar={webinar} />
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
              <AttendanceChart webinar={webinar} />
            </div>
          </CardContent>
        </Card>
        
        {/* More analytics charts can be added here */}
      </div>
    </div>
  );
};
