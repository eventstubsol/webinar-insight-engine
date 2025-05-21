
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useZoomWebinars } from '@/hooks/zoom';
import { parseISO, format, isValid, subMonths, startOfMonth, addMonths, isBefore, isAfter } from 'date-fns';
import { BarChartIcon, Calendar } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Color palette for the bars - 12 different colors
const COLOR_PALETTE = [
  '#9b87f5', // Primary Purple
  '#7E69AB', // Secondary Purple
  '#6E59A5', // Tertiary Purple
  '#8B5CF6', // Vivid Purple
  '#D946EF', // Magenta Pink
  '#F97316', // Bright Orange
  '#0EA5E9', // Ocean Blue
  '#1EAEDB', // Bright Blue
  '#33C3F0', // Sky Blue
  '#ea384c', // Red
  '#6366F1', // Indigo
  '#10B981'  // Emerald
];

type TimeRangeView = 'past' | 'future';

export const WebinarDistributionChart = () => {
  const { webinars, isLoading } = useZoomWebinars();
  const [timeRange, setTimeRange] = useState<TimeRangeView>('past');
  
  const monthlyDistribution = useMemo(() => {
    const today = new Date();
    let monthsArray = [];
    
    if (timeRange === 'past') {
      // Generate the last 12 months for past view
      monthsArray = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(today, 11 - i); // Start from 11 months ago
        const monthStart = startOfMonth(date);
        const monthKey = format(monthStart, 'MMM yyyy');
        const month = format(monthStart, 'MMM');
        const year = format(monthStart, 'yyyy');
        
        return {
          date: monthStart,
          monthKey,
          month,
          year,
          monthYear: monthKey, // Changed to use monthKey (MMM yyyy) instead of just month
          total: 0
        };
      });
    } else {
      // Generate the next 12 months for future view
      monthsArray = Array.from({ length: 12 }, (_, i) => {
        const date = addMonths(today, i); // Start from current month
        const monthStart = startOfMonth(date);
        const monthKey = format(monthStart, 'MMM yyyy');
        const month = format(monthStart, 'MMM');
        const year = format(monthStart, 'yyyy');
        
        return {
          date: monthStart,
          monthKey,
          month,
          year,
          monthYear: monthKey,
          total: 0
        };
      });
    }
    
    // Create a map for fast lookup
    const distributionMap = new Map(
      monthsArray.map(item => [item.monthKey, item])
    );
    
    // If we have webinar data, update the counts
    if (webinars && webinars.length > 0) {
      webinars.forEach(webinar => {
        if (!webinar.start_time) return;
        
        try {
          const date = parseISO(webinar.start_time);
          if (!isValid(date)) return;
          
          const monthKey = format(date, 'MMM yyyy');
          const isPastWebinar = isBefore(date, today) || webinar.status === 'ended';
          const isFutureWebinar = isAfter(date, today) && webinar.status !== 'ended';
          
          // Only update if this month is in our window and matches the selected view
          if (distributionMap.has(monthKey)) {
            if ((timeRange === 'past' && isPastWebinar) || 
                (timeRange === 'future' && isFutureWebinar)) {
              const entry = distributionMap.get(monthKey);
              if (entry) {
                entry.total += 1;
              }
            }
          }
        } catch (error) {
          console.error('Error parsing date:', webinar.start_time, error);
        }
      });
    }
    
    // Convert map back to array and ensure it's sorted by date
    return Array.from(distributionMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [webinars, timeRange]);

  const chartConfig = {
    total: { 
      label: "Webinars", 
      theme: {
        light: "#0EA5E9",
        dark: "#0EA5E9"
      }
    }
  };

  const getCardDescription = () => {
    return timeRange === 'past' 
      ? "Last 12 months of webinar activity" 
      : "Next 12 months of scheduled webinars";
  };

  return (
    <Card className="col-span-1">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold">Monthly Webinar Distribution</CardTitle>
          <CardDescription>{getCardDescription()}</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <ToggleGroup type="single" value={timeRange} onValueChange={(value) => value && setTimeRange(value as TimeRangeView)}>
            <ToggleGroupItem value="past" aria-label="Last 12 Months" className="text-xs">
              Last 12 Months
            </ToggleGroupItem>
            <ToggleGroupItem value="future" aria-label="Next 12 Months" className="text-xs">
              Next 12 Months
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Calendar className="h-4 w-4" />
          </div>
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
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                barSize={40}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" opacity={0.7} />
                <XAxis 
                  dataKey="monthYear" 
                  tick={{ fontSize: 12, fontFamily: 'inherit', fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis 
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 12, fontFamily: 'inherit', fill: '#64748b' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <ChartTooltipContent
                          payload={payload}
                          active={active}
                          label={`${payload[0]?.payload.month} ${payload[0]?.payload.year}`}
                        />
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="total" 
                  name="Total Webinars" 
                  radius={[4, 4, 0, 0]}
                >
                  {monthlyDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={timeRange === 'past' ? COLOR_PALETTE[index % COLOR_PALETTE.length] : 'none'}
                      stroke={timeRange === 'future' ? COLOR_PALETTE[index % COLOR_PALETTE.length] : undefined}
                      strokeWidth={timeRange === 'future' ? 2 : undefined}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
