
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight } from 'lucide-react';
import { useZoomWebinars } from '@/hooks/zoom';
import { parseISO, format, isValid } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export const RecentWebinars = () => {
  const { webinars, isLoading } = useZoomWebinars();
  const navigate = useNavigate();

  // Get recent past webinars (completed)
  const recentWebinars = React.useMemo(() => {
    if (!webinars || webinars.length === 0) return [];
    
    return webinars
      .filter(webinar => {
        if (!webinar.start_time) return false;
        try {
          const startTime = parseISO(webinar.start_time);
          return isValid(startTime) && startTime < new Date();
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => {
        if (!a.start_time || !b.start_time) return 0;
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      })
      .slice(0, 5); // Show only the 5 most recent webinars
  }, [webinars]);

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'Invalid date';
      return format(date, "MMM d, yyyy, h:mm a");
    } catch (e) {
      return 'Error parsing date';
    }
  };

  const getTimezone = (webinar: any) => {
    return webinar.timezone || 'UTC';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Recent Webinars</CardTitle>
            <CardDescription>Completed webinars from your Zoom account</CardDescription>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1 text-primary"
          onClick={() => navigate('/webinars')}
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : recentWebinars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <p>No completed webinars available</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/webinars')}
            >
              Go to Webinars
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentWebinars.map((webinar) => (
                <TableRow key={webinar.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/webinars/${webinar.id}`)}>
                  <TableCell className="min-w-[200px]">
                    <div className="font-medium">{formatDateTime(webinar.start_time)}</div>
                    <div className="text-xs text-muted-foreground">{getTimezone(webinar)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{webinar.topic}</div>
                    <div className="text-xs text-muted-foreground">ID: {webinar.id}</div>
                  </TableCell>
                  <TableCell>{webinar.duration ? `${webinar.duration} min` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
