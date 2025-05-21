
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useZoomWebinars } from '@/hooks/zoom';
import { 
  parseISO, 
  format, 
  isValid, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  isSameMonth,
  isAfter,
  isBefore,
  addMonths
} from 'date-fns';
import { TrendingUp, Users, RefreshCw, Calendar } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { updateParticipantDataForWebinars } from '@/hooks/zoom/utils/webinarUtils';
import { useAuth } from '@/hooks/useAuth';

export const RegistrationAttendanceChart = () => {
  const { webinars, isLoading, refreshWebinars } = useZoomWebinars();
  const [updatingParticipantData, setUpdatingParticipantData] = useState(false);
  const [debug, setDebug] = useState(false);
  const { user } = useAuth(); // Get the current user
  
  // Calculate registrants and attendees aggregated by month for the last 12 months
  const webinarStats = useMemo(() => {
    const DEBUG = debug;
    
    // Generate all months for the last 12 months
    const today = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = subMonths(today, 11 - i);
      return {
        month: startOfMonth(month),
        name: format(month, 'MMM yyyy'),
        registrants: 0,
        attendees: 0
      };
    });

    if (!webinars || webinars.length === 0) {
      if (DEBUG) console.log('No webinars data available');
      return months;
    }
    
    if (DEBUG) {
      console.log(`Processing ${webinars.length} webinars for chart data`);
      console.log('Generated month ranges:', months.map(m => m.name));
    }
    
    // Filter webinars to get only past webinars (end date in the past)
    const pastWebinars = webinars.filter(webinar => {
      if (!webinar.start_time) return false;
      
      try {
        const startDate = parseISO(webinar.start_time);
        if (!isValid(startDate)) return false;
        
        // Calculate the end time (start time + duration in minutes)
        const endDate = new Date(startDate.getTime() + (webinar.duration || 0) * 60 * 1000);
        
        // Check if webinar has ended (end time is in the past)
        const hasEnded = isBefore(endDate, new Date());
        
        if (DEBUG && hasEnded) {
          console.log(`Webinar "${webinar.topic}" has ended. Start: ${webinar.start_time}, Duration: ${webinar.duration}min`);
          console.log(`Participants: ${webinar.participants_count}, Registrants: ${webinar.registrants_count}`);
        }
        
        return hasEnded;
      } catch (err) {
        console.error('Error parsing webinar date:', err, webinar);
        return false;
      }
    });
    
    if (DEBUG) {
      console.log(`Found ${pastWebinars.length} past webinars out of ${webinars.length} total`);
    }
    
    // Iterate through completed webinars and aggregate data by month
    pastWebinars.forEach(webinar => {
      if (!webinar.start_time) return;
      
      try {
        const webinarDate = parseISO(webinar.start_time);
        if (!isValid(webinarDate)) {
          if (DEBUG) console.log(`Invalid webinar date: ${webinar.start_time}`);
          return;
        }
        
        // Find the month entry that corresponds to this webinar
        const monthEntry = months.find(m => {
          const monthStart = m.month;
          const monthEnd = endOfMonth(m.month);
          
          // Check if webinar date is within this month
          const isInMonth = 
            isAfter(webinarDate, monthStart) && 
            isBefore(webinarDate, monthEnd) || 
            isSameMonth(webinarDate, monthStart);
          
          if (DEBUG && isInMonth) {
            console.log(`Webinar "${webinar.topic}" on ${webinar.start_time} matches month ${m.name}`);
          }
          
          return isInMonth;
        });
        
        if (!monthEntry) {
          if (DEBUG) {
            console.log(`No month entry found for webinar "${webinar.topic}" on ${webinar.start_time}`);
          }
          return;
        }
        
        // Extract registrants and attendees data
        let registrants = 0;
        let attendees = 0;
        
        // Try to get data from raw_data first
        if (webinar.raw_data && typeof webinar.raw_data === 'object') {
          registrants = webinar.raw_data.registrants_count || 0;
          attendees = webinar.raw_data.participants_count || 0;
        } 
        
        // Fallback to direct properties if raw_data doesn't have the counts
        if (registrants === 0 && webinar.registrants_count) {
          registrants = webinar.registrants_count;
        }
        
        if (attendees === 0 && webinar.participants_count) {
          attendees = webinar.participants_count;
        }
        
        if (DEBUG) {
          console.log(`Adding to ${monthEntry.name}: ${registrants} registrants, ${attendees} attendees`);
        }
        
        // Add to the month's total
        monthEntry.registrants += registrants;
        monthEntry.attendees += attendees;
      } catch (err) {
        console.error('Error processing webinar for chart:', err, webinar);
      }
    });
    
    if (DEBUG) {
      console.log('Final chart data:', months);
    }
    
    return months;
  }, [webinars, debug]);

  // Handle updating webinar participant data
  const handleUpdateParticipantData = async () => {
    if (updatingParticipantData) return;
    
    try {
      setUpdatingParticipantData(true);
      console.log('Starting participant data update');
      
      // Pass the user.id to the function - this fixes the TypeScript error
      await updateParticipantDataForWebinars(user?.id);
      
      // Refresh webinars to get updated data
      await refreshWebinars();
      
    } catch (err) {
      console.error('Error updating participant data:', err);
    } finally {
      setUpdatingParticipantData(false);
    }
  };

  // Format the chart data with proper colors and stacked areas
  const chartConfig = {
    registrants: { 
      label: "Registrants", 
      color: "rgba(50, 180, 100, 0.8)" // Green for registrants
    },
    attendees: { 
      label: "Attendees", 
      color: "rgba(30, 174, 219, 0.8)" // Blue for attendees
    }
  };

  // Check if we have any data to display (at least one month with non-zero registrants or attendees)
  const hasData = webinarStats.some(month => month.registrants > 0 || month.attendees > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold">Registration vs Attendance</CardTitle>
          <CardDescription>Monthly trends for the last 12 months</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setDebug(!debug)}
            className="flex items-center gap-1"
          >
            {debug ? 'Hide Debug' : 'Debug'}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleUpdateParticipantData}
            disabled={updatingParticipantData || isLoading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${updatingParticipantData ? 'animate-spin' : ''}`} />
            {updatingParticipantData ? 'Updating...' : 'Update Data'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="w-full h-80">
        {isLoading || updatingParticipantData ? (
          <div className="flex items-center justify-center h-full w-full">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            {debug && webinars && webinars.length > 0 ? (
              <div className="w-full h-full overflow-auto p-4">
                <h3 className="font-semibold mb-2">Debug Information:</h3>
                <p className="mb-2">Found {webinars.length} webinars but no chart data.</p>
                <div className="space-y-4">
                  {webinars.slice(0, 5).map(webinar => (
                    <div key={webinar.id} className="text-xs p-2 border rounded">
                      <p>Title: {webinar.topic}</p>
                      <p>Date: {webinar.start_time}</p>
                      <p>Status: {webinar.status}</p>
                      <p>Registrants: {webinar.registrants_count || webinar.raw_data?.registrants_count || 0}</p>
                      <p>Participants: {webinar.participants_count || webinar.raw_data?.participants_count || 0}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <Calendar className="h-12 w-12 mb-2" />
                <p className="mb-4">No registration or attendance data available</p>
                <p className="mb-4 text-sm max-w-md text-center">
                  This chart displays data from completed webinars. Make sure you have past webinars 
                  with registration and attendance records.
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleUpdateParticipantData}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Update Participant Data
                </Button>
              </>
            )}
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={webinarStats}
                margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <ChartTooltipContent
                          payload={payload}
                          active={active}
                          label={label}
                        />
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="registrants" 
                  name="Registrants"
                  fill="rgba(50, 180, 100, 0.8)" 
                  stroke="rgba(50, 180, 100, 1)"
                  strokeWidth={2}
                  stackId="1"
                  fillOpacity={0.8}
                />
                <Area 
                  type="monotone" 
                  dataKey="attendees" 
                  name="Attendees"
                  fill="rgba(30, 174, 219, 0.8)" 
                  stroke="rgba(30, 174, 219, 1)"
                  strokeWidth={2}
                  stackId="1"
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
