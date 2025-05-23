import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useZoomWebinars } from '@/hooks/zoom';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface RecentWebinarsProps {
  isRefreshing?: boolean;
}

export const RecentWebinars: React.FC<RecentWebinarsProps> = ({ isRefreshing = false }) => {
  const { webinars, isLoading } = useZoomWebinars();
  const navigate = useNavigate();
  
  // Get past webinars, sorted by date (most recent first)
  const pastWebinars = React.useMemo(() => {
    return webinars
      .filter(webinar => 
        webinar.status?.toLowerCase() === 'ended' || 
        webinar.status?.toLowerCase() === 'completed'
      )
      .sort((a, b) => {
        // Sort by start_time in descending order (most recent first)
        const dateA = a.start_time ? new Date(a.start_time).getTime() : 0;
        const dateB = b.start_time ? new Date(b.start_time).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5); // Only show the 5 most recent
  }, [webinars]);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <Card className="col-span-1 h-full relative">
      {/* Overlay for refreshing state */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg z-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      
      <CardHeader className="pb-2">
        <CardTitle>Recent Webinars</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && !isRefreshing ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : pastWebinars.length === 0 ? (
          <div className="text-center py-6">
            <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="mt-2 text-sm font-medium text-muted-foreground">No past webinars</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Past webinars will appear here once they've been completed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pastWebinars.map((webinar) => (
              <div key={webinar.id} className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium truncate" title={webinar.topic}>
                    {webinar.topic}
                  </h3>
                  <Badge variant="outline" className="ml-2 shrink-0">
                    {webinar.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{webinar.start_time ? formatDate(webinar.start_time) : 'No date'}</span>
                  <span>
                    {webinar.raw_data?.participants_count || webinar.participants_count || 0} attendees
                  </span>
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              className="w-full mt-4" 
              onClick={() => navigate('/webinars')}
            >
              View All Webinars
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentWebinars;
