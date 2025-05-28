
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useZoomWebinars } from '@/hooks/zoom';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { RegistrationAttendanceTooltip } from './RegistrationAttendanceTooltip';
import { RegistrationAttendanceContent } from './RegistrationAttendanceContent';

export const RegistrationAttendanceChart = () => {
  const { webinars, isLoading } = useZoomWebinars();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration vs Attendance</CardTitle>
          <CardDescription>Compare registration numbers with actual attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Filter and process webinars with both registration and attendance data
  const webinarStats = webinars
    ?.filter(webinar => 
      webinar.status === 'ended' && 
      (webinar.registrants_count > 0 || webinar.participants_count > 0)
    )
    ?.slice(0, 10) // Show last 10 webinars
    ?.map(webinar => {
      const startDate = webinar.start_time ? new Date(webinar.start_time) : new Date();
      return {
        month: startDate ? format(startDate, 'MMMyy') : 'TBD',
        monthDate: startDate,
        registrants: webinar.registrants_count || 0,
        attendees: webinar.participants_count || 0,
      };
    })
    ?.reverse() || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration vs Attendance</CardTitle>
        <CardDescription>
          Compare registration numbers with actual attendance for recent webinars
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegistrationAttendanceContent webinarStats={webinarStats} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
};
