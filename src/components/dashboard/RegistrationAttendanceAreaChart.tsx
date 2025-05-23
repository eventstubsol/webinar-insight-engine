
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useZoomWebinars } from '@/hooks/zoom';
import RegistrationAttendanceContent from './charts/RegistrationAttendanceContent';
import { calculateWebinarStats } from './charts/RegistrationAttendanceUtils';
import { Loader2 } from 'lucide-react';

interface RegistrationAttendanceAreaChartProps {
  isRefreshing?: boolean;
}

export const RegistrationAttendanceAreaChart: React.FC<RegistrationAttendanceAreaChartProps> = ({ 
  isRefreshing = false 
}) => {
  const { webinars, isLoading } = useZoomWebinars();
  
  const webinarStats = useMemo(() => {
    return calculateWebinarStats(webinars, isLoading);
  }, [webinars, isLoading]);

  // Debug logging
  console.log('RegistrationAttendanceAreaChart render:', {
    statsDataPoints: webinarStats.length,
    webinarsCount: webinars.length,
    hasRawData: webinars.some(w => !!w.raw_data),
    hasParticipantsCount: webinars.some(w => w.raw_data && typeof w.raw_data.participants_count !== 'undefined'),
    hasRegistrantsCount: webinars.some(w => w.raw_data && typeof w.raw_data.registrants_count !== 'undefined'),
  });

  return (
    <Card className="col-span-1 h-full relative">
      {/* Overlay for refreshing state */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg z-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      
      <CardHeader className="pb-0">
        <CardTitle>Registration & Attendance</CardTitle>
        <CardDescription>Monthly registrations and actual attendees</CardDescription>
      </CardHeader>
      <CardContent className="w-full h-80">
        <RegistrationAttendanceContent 
          webinarStats={webinarStats}
          isLoading={isLoading && !isRefreshing}
        />
      </CardContent>
    </Card>
  );
};

export default RegistrationAttendanceAreaChart;
