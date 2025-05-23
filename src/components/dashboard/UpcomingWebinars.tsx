import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useZoomWebinars } from '@/hooks/zoom';
import { format, parseISO, isAfter } from 'date-fns';
import { Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface UpcomingWebinarsProps {
  isRefreshing?: boolean;
}

export const UpcomingWebinars: React.FC<UpcomingWebinarsProps> = ({ isRefreshing = false }) => {
  const { webinars, isLoading } = useZoomWebinars();
  const navigate = useNavigate();
  
  // Filter to get only upcoming webinars
  const upcomingWebinars = React.useMemo(() => {
    if (!webinars || webinars.length === 0) return [];
    
    const now = new Date();
    return webinars
      .filter(webinar => {
        if (!webinar.start_time) return false;
        try {
          const startTime = parseISO(webinar.start_time);
          return isAfter(startTime, now);
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => {
        const dateA = a.start_time ? new Date(a.start_time) : new Date();
        const dateB = b.start_time ? new Date(b.start_time) : new Date();
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5); // Show only the next 5 upcoming webinars
  }, [webinars]);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy • h:mm a');
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
      
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Upcoming Webinars</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs"
          onClick={() => navigate('/webinars')}
        >
          View all
        </Button>
      </CardHeader>
      
      <CardContent>
        {isLoading && !isRefreshing ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : upcomingWebinars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No upcoming webinars</p>
            <p className="text-xs text-muted-foreground mt-1">
              Schedule a webinar in Zoom to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingWebinars.map((webinar) => (
              <div 
                key={webinar.id} 
                className="border-b pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 -mx-6 px-6 py-2 rounded-md transition-colors"
                onClick={() => navigate(`/webinars/${webinar.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm line-clamp-1">{webinar.topic}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {webinar.start_time ? formatDate(webinar.start_time) : 'No date'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {webinar.status || 'Scheduled'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingWebinars;
