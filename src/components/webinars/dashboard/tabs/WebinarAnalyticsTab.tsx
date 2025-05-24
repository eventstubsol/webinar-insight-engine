
import React from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegistrationAttendanceChart } from '@/components/dashboard/RegistrationAttendanceChart';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

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
        
        {/* More analytics charts can be added here */}
      </div>
    </div>
  );
};
