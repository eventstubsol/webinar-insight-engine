
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useZoomWebinars } from '@/hooks/zoom';
import { parseISO, format, startOfMonth, isValid } from 'date-fns';
import { BarChartIcon, Calendar } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export const WebinarDistributionChart = () => {
  const { webinars, isLoading } = useZoomWebinars();
  
  const monthlyDistribution = useMemo(() => {
    if (!webinars || webinars.length === 0) return [];
    
    const distribution = new Map();
    
    // Group webinars by month
    webinars.forEach(webinar => {
      if (!webinar.start_time) return;
      
      try {
        const date = parseISO(webinar.start_time);
        if (!isValid(date)) return;
        
        const monthKey = format(date, 'MMM yyyy');
        const month = format(date, 'MMM');
        const year = format(date, 'yyyy');
        
        if (!distribution.has(monthKey)) {
          distribution.set(monthKey, { 
            month,
            year,
            monthYear: monthKey,
            total: 0,
            completed: 0,
            upcoming: 0
          });
        }
        
        const entry = distribution.get(monthKey);
        entry.total += 1;
        
        if (date < new Date()) {
          entry.completed += 1;
        } else {
          entry.upcoming += 1;
        }
      } catch (error) {
        console.error('Error parsing date:', webinar.start_time, error);
      }
    });
    
    // Convert to array and sort by date
    return Array.from(distribution.values())
      .sort((a, b) => {
        const dateA = new Date(`${a.month} 1, ${a.year}`);
        const dateB = new Date(`${b.month} 1, ${b.year}`);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-6); // Show last 6 months
  }, [webinars]);

  const chartConfig = {
    completed: { 
      label: "Completed", 
      theme: {
        light: "hsl(var(--chart-completed))",
        dark: "hsl(var(--chart-completed))"
      }
    },
    upcoming: { 
      label: "Upcoming", 
      theme: {
        light: "hsl(var(--chart-upcoming))",
        dark: "hsl(var(--chart-upcoming))"
      }
    }
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold">Monthly Webinar Distribution</CardTitle>
          <CardDescription>Number of webinars by month</CardDescription>
        </div>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Calendar className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="w-full h-80">
        {isLoading ? (
          <div className="flex items-center justify-center h-full w-full">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : monthlyDistribution.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <BarChartIcon className="h-12 w-12 mb-2" />
            <p>No webinar data available</p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyDistribution}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="monthYear" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <ChartTooltipContent
                          payload={payload}
                          active={active}
                          label={payload[0]?.payload.monthYear}
                        />
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="completed" 
                  stackId="a" 
                  name="Completed" 
                  fill="var(--color-completed)" 
                />
                <Bar 
                  dataKey="upcoming" 
                  stackId="a" 
                  name="Upcoming" 
                  fill="var(--color-upcoming)" 
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
