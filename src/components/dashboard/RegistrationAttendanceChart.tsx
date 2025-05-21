
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useZoomWebinars } from '@/hooks/zoom';
import { updateParticipantDataForWebinars } from '@/hooks/zoom/utils/webinarUtils';
import { useAuth } from '@/hooks/useAuth';

import { 
  calculateWebinarStats, 
  calculateTotalRegistrants, 
  calculateTotalAttendees, 
  calculateAttendanceRate 
} from './charts/RegistrationAttendanceUtils';
import RegistrationAttendanceContent from './charts/RegistrationAttendanceContent';
import UpdateParticipantDataButton from './charts/UpdateParticipantDataButton';

export const RegistrationAttendanceChart: React.FC = () => {
  const { webinars, isLoading, refreshWebinars } = useZoomWebinars();
  const [updatingParticipantData, setUpdatingParticipantData] = useState(false);
  const [debug, setDebug] = useState(false);
  const { user } = useAuth();
  
  // Calculate registrants and attendees aggregated by month for the last 12 months
  const webinarStats = useMemo(() => 
    calculateWebinarStats(webinars, isLoading, debug), 
    [webinars, isLoading, debug]
  );
  
  // Calculate totals for the title
  const totalRegistrants = useMemo(() => 
    calculateTotalRegistrants(webinarStats),
    [webinarStats]
  );
  
  const totalAttendees = useMemo(() => 
    calculateTotalAttendees(webinarStats),
    [webinarStats]
  );
  
  const attendanceRate = useMemo(() => 
    calculateAttendanceRate(totalRegistrants, totalAttendees),
    [totalRegistrants, totalAttendees]
  );
  
  const handleUpdateParticipantData = async () => {
    if (!user) {
      console.error('No user found, cannot update participant data');
      return;
    }
    
    try {
      setUpdatingParticipantData(true);
      console.log('Starting participant data update');
      
      // Pass the user.id to the function
      await updateParticipantDataForWebinars(user.id);
      
      // Refresh webinars to get updated data
      await refreshWebinars();
      
      if (debug) {
        console.log('Participant data update completed, webinars refreshed');
      }
    } catch (error) {
      console.error('Error updating participant data:', error);
    } finally {
      setUpdatingParticipantData(false);
    }
  };
  
  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base sm:text-lg">Registration vs. Attendance</CardTitle>
          <CardDescription>
            Last 12 months • 
            {isLoading ? (
              <Skeleton className="w-10 h-4 ml-1 inline-block" />
            ) : (
              ` ${attendanceRate}% attendance rate`
            )}
          </CardDescription>
        </div>
        <UpdateParticipantDataButton 
          isUpdating={updatingParticipantData} 
          isDisabled={!user}
          onUpdate={handleUpdateParticipantData} 
        />
      </CardHeader>
      <CardContent>
        <RegistrationAttendanceContent 
          webinarStats={webinarStats} 
          isLoading={isLoading} 
        />
      </CardContent>
    </Card>
  );
};

export default RegistrationAttendanceChart;
