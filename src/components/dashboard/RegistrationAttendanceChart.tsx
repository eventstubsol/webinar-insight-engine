
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useZoomWebinars } from '@/hooks/zoom';
import { parseISO, format, isValid, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { TrendingUp, Users } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export const RegistrationAttendanceChart = () => {
  const { webinars, isLoading } = useZoomWebinars();
  
  // Calculate registrants and attendees aggregated by month for the last 12 months
  const webinarStats = useMemo(() => {
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

    if (!webinars || webinars.length === 0) return months;
    
    // Iterate through completed webinars and aggregate data by month
    webinars
      .filter(webinar => webinar.start_time && new Date(webinar.start_time) < new Date())
      .forEach(webinar => {
        if (!webinar.start_time) return;
        
        const webinarDate = parseISO(webinar.start_time);
        // Find the month entry that corresponds to this webinar
        const monthEntry = months.find(m => isSameMonth(m.month, webinarDate));
        if (!monthEntry) return;
        
        // Extract registrants and attendees data
        let registrants = 0;
        let attendees = 0;
        
        if (webinar.raw_data) {
          // Try to get values from raw_data
          if (typeof webinar.raw_data === 'object') {
            registrants = webinar.raw_data.registrants_count || 0;
            attendees = webinar.raw_data.participants_count || 0;
          }
        }
        
        // Add to the month's total
        monthEntry.registrants += registrants;
        monthEntry.attendees += attendees;
      });
    
    return months;
  }, [webinars]);

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold">Registration vs Attendance</CardTitle>
          <CardDescription>Monthly trends for the last 12 months</CardDescription>
        </div>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <TrendingUp className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="w-full h-80">
        {isLoading ? (
          <div className="flex items-center justify-center h-full w-full">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : webinarStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Users className="h-12 w-12 mb-2" />
            <p>No attendance data available</p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
          >
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
