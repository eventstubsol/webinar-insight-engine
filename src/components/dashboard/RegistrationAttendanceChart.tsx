
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
        <CardTitle className="text-base font-semibold">Registration vs Attendance</CardTitle>
        <CardDescription>Last 12 months of registration vs attendance comparison</CardDescription>
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
