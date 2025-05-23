
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useZoomWebinars } from '@/hooks/zoom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface WebinarDistributionChartProps {
  isRefreshing?: boolean;
}

export const WebinarDistributionChart: React.FC<WebinarDistributionChartProps> = ({ 
  isRefreshing = false 
}) => {
  const { webinars, isLoading } = useZoomWebinars();
  
  const chartData = useMemo(() => {
    if (isLoading && !webinars.length) {
      return [];
    }
    
    try {
      // Count webinars by status
      const statusCounts: Record<string, number> = {};
      
      webinars.forEach(webinar => {
        // Normalize status to handle null/undefined and ensure consistent capitalization
        const status = (webinar.status || 'unknown').toLowerCase();
        
        // Group similar statuses
        let normalizedStatus = status;
        if (status === 'started' || status === 'in_progress') {
          normalizedStatus = 'live';
        } else if (status === 'ended' || status === 'completed') {
          normalizedStatus = 'ended';
        } else if (status === 'waiting' || status === 'scheduled') {
          normalizedStatus = 'upcoming';
        }
        
        statusCounts[normalizedStatus] = (statusCounts[normalizedStatus] || 0) + 1;
      });
      
      // Convert to array format for chart
      const result = Object.entries(statusCounts).map(([name, value]) => ({
        name: capitalizeFirstLetter(name),
        value
      }));
      
      // If we have no data, return placeholder data
      if (result.length === 0) {
        return [
          { name: 'Live', value: 0 },
          { name: 'Upcoming', value: 0 },
          { name: 'Ended', value: 0 }
        ];
      }
      
      return result;
    } catch (error) {
      console.error('Error processing webinar distribution data:', error);
      return [
        { name: 'Error', value: 1 }
      ];
    }
  }, [webinars, isLoading]);
  
  function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  // Colors for different webinar statuses
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  
  // Debug logging
  console.log('WebinarDistributionChart render:', {
    chartData,
    webinarsCount: webinars.length,
    statuses: webinars.map(w => w.status),
    isLoading,
    isRefreshing
  });

  // Always render the card, but show skeletons if loading
  return (
    <Card className="col-span-1 h-full relative">
      {/* Overlay for refreshing state */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg z-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      
      <CardHeader className="pb-0">
        <CardTitle>Webinar Distribution</CardTitle>
        <CardDescription>Breakdown of webinars by status</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        {isLoading && !isRefreshing && webinars.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="h-64 w-64 rounded-full" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-muted-foreground">No webinar data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} webinars`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default WebinarDistributionChart;
