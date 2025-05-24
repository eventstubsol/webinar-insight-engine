
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegistrationAttendanceContent } from './charts/RegistrationAttendanceContent';
import { MonthlyAttendanceData } from './charts/RegistrationAttendanceUtils';

interface RegistrationAttendanceChartProps {
  data: MonthlyAttendanceData[];
  isLoading?: boolean;
}

export const RegistrationAttendanceChart: React.FC<RegistrationAttendanceChartProps> = ({ 
  data, 
  isLoading = false 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration vs Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <RegistrationAttendanceContent 
          webinarStats={data} 
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
};
