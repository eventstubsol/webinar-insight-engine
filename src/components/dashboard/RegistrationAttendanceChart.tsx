
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  TooltipProps
} from 'recharts';
import {
  NameType,
  ValueType,
} from 'recharts/types/component/DefaultTooltipContent';
import { Loader2, BarChartIcon, RefreshCw } from 'lucide-react';
import { useZoomWebinars } from '@/hooks/zoom';
import { format, parseISO, subMonths, startOfMonth, isAfter, isBefore, addMinutes } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { updateParticipantDataForWebinars } from '@/hooks/zoom/utils/webinarUtils';
import { useAuth } from '@/hooks/useAuth';

export const RegistrationAttendanceChart = () => {
  const { webinars, isLoading, refreshWebinars } = useZoomWebinars();
  const [updatingParticipantData, setUpdatingParticipantData] = useState(false);
  const [debug, setDebug] = useState(false);
  const { user } = useAuth();
  
  // Calculate registrants and attendees aggregated by month for the last 12 months
  const webinarStats = useMemo(() => {
    if (!webinars || isLoading) return [];
    
    // Get 12 months ago from now
    const twelveMonthsAgo = subMonths(new Date(), 12);
    const startDate = startOfMonth(twelveMonthsAgo);
    
    // Filter webinars that have already ended (either status is 'ended' or the start_time + duration is in the past)
    const now = new Date();
    const completedWebinars = webinars.filter(webinar => {
      const startTime = webinar.start_time ? new Date(webinar.start_time) : null;
      
      if (!startTime) return false;
      
      // Include webinars with 'ended' status
      if (webinar.status === 'ended') return true;
      
      // Include webinars that happened in the past (start_time + duration has passed)
      const endTime = addMinutes(startTime, webinar.duration || 0);
      return endTime < now;
    });
    
    // Log filtered webinars if debug mode is on
    if (debug) {
      console.log('Complete webinars for chart:', completedWebinars);
    }
    
    // Create a map of months with their aggregated data
    const monthlyData = new Map();
    
    // Initialize the map with the last 12 months
    for (let i = 0; i < 12; i++) {
      const month = subMonths(new Date(), i);
      const monthKey = format(month, 'MMM yyyy');
      monthlyData.set(monthKey, { 
        month: monthKey,
        registrants: 0, 
        attendees: 0
      });
    }
    
    // Add data from webinars
    completedWebinars.forEach(webinar => {
      // Skip if no start_time
      if (!webinar.start_time) return;
      
      const webinarDate = new Date(webinar.start_time);
      
      // Skip if the webinar is older than 12 months
      if (isBefore(webinarDate, startDate)) return;
      
      const monthKey = format(webinarDate, 'MMM yyyy');
      
      // If this month isn't in our map (should not happen given initialization), skip
      if (!monthlyData.has(monthKey)) return;
      
      const currentData = monthlyData.get(monthKey);
      
      // Get registrant and participant counts from raw_data if available
      let registrantsCount = 0;
      let attendeesCount = 0;
      
      if (webinar.raw_data && typeof webinar.raw_data === 'object') {
        registrantsCount = webinar.raw_data.registrants_count || 0;
        attendeesCount = webinar.raw_data.participants_count || 0;
      } else {
        // Try the direct properties as fallback
        registrantsCount = webinar.registrants_count || 0;
        attendeesCount = webinar.participants_count || 0;
      }
      
      // Update the month data
      monthlyData.set(monthKey, {
        ...currentData,
        registrants: currentData.registrants + registrantsCount,
        attendees: currentData.attendees + attendeesCount
      });
    });
    
    // Convert map to array and sort by date
    return Array.from(monthlyData.values())
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
      // No longer slicing to the last 6 months - showing all 12 months
  }, [webinars, isLoading, debug]);
  
  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">{`Registrants: ${payload[0]?.value || 0}`}</p>
          <p className="text-green-600">{`Attendees: ${payload[1]?.value || 0}`}</p>
          
          // Calculate attendance rate for the tooltip
          {(() => {
            const registrants = payload[0]?.value as number || 0;
            const attendees = payload[1]?.value as number || 0;
            const rate = registrants > 0 ? Math.round((attendees / registrants) * 100) : 0;
            return <p className="text-gray-600">{`Attendance Rate: ${rate}%`}</p>;
          })()}
        </div>
      );
    }
    return null;
  };
  
  // Calculate totals for the title
  const totalRegistrants = useMemo(() => {
    return webinarStats.reduce((total, item) => total + item.registrants, 0);
  }, [webinarStats]);
  
  const totalAttendees = useMemo(() => {
    return webinarStats.reduce((total, item) => total + item.attendees, 0);
  }, [webinarStats]);
  
  const attendanceRate = useMemo(() => {
    if (totalRegistrants === 0) return 0;
    return Math.round((totalAttendees / totalRegistrants) * 100);
  }, [totalRegistrants, totalAttendees]);
  
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
        <Button
          variant="outline"
          size="sm"
          onClick={handleUpdateParticipantData}
          disabled={updatingParticipantData || !user}
        >
          {updatingParticipantData ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-3 w-3" />
              Update Data
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : webinarStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <BarChartIcon className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No webinar data available</p>
            <p className="text-xs text-muted-foreground">
              Once your past webinars are synced, attendance data will appear here
            </p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={webinarStats}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 5,
                }}
              >
                <defs>
                  <linearGradient id="registrantsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="attendeesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="registrants" 
                  name="Registrants" 
                  stroke="#3b82f6" 
                  fill="url(#registrantsGradient)" 
                  strokeWidth={2}
                  stackId="1"
                />
                <Area 
                  type="monotone" 
                  dataKey="attendees" 
                  name="Attendees" 
                  stroke="#10b981" 
                  fill="url(#attendeesGradient)" 
                  strokeWidth={2}
                  stackId="2"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
