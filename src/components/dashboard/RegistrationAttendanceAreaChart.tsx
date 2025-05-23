
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useZoomWebinars } from '@/hooks/zoom';
import RegistrationAttendanceContent from './charts/RegistrationAttendanceContent';
import { calculateWebinarStats } from './charts/RegistrationAttendanceUtils';

export const RegistrationAttendanceAreaChart: React.FC = () => {
  const { webinars, isLoading } = useZoomWebinars();
  
  const webinarStats = useMemo(() => {
    return calculateWebinarStats(webinars, isLoading);
  }, [webinars, isLoading]);

  return (
    <Card className="col-span-1 h-full">
      <CardHeader className="pb-0">
        <CardTitle>Registration & Attendance</CardTitle>
        <CardDescription>Monthly registrations and actual attendees</CardDescription>
      </CardHeader>
      <CardContent className="w-full h-80">
        <RegistrationAttendanceContent 
          webinarStats={webinarStats}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
};

export default RegistrationAttendanceAreaChart;
