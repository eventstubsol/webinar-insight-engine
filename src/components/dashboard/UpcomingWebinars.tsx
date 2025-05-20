
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Eye } from 'lucide-react';
import { useZoomWebinars } from '@/hooks/zoom';
import { parseISO, format, isValid, differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export const UpcomingWebinars = () => {
  const { webinars, isLoading } = useZoomWebinars();
  const navigate = useNavigate();

  // Get upcoming webinars
  const upcomingWebinars = React.useMemo(() => {
    if (!webinars || webinars.length === 0) return [];
    
    const now = new Date();
    
    return webinars
      .filter(webinar => {
        if (!webinar.start_time) return false;
        try {
          const startTime = parseISO(webinar.start_time);
          return isValid(startTime) && startTime > now;
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => {
        if (!a.start_time || !b.start_time) return 0;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      })
      .slice(0, 5); // Show only the next 5 upcoming webinars
  }, [webinars]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'Invalid date';
      return format(date, 'MMM d, yyyy');
    } catch (e) {
      return 'Error parsing date';
    }
  };
  
  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'Invalid date';
      return format(date, 'h:mm a');
    } catch (e) {
      return 'Error parsing time';
    }
  };
  
  const getTimeBadgeVariant = (dateString: string | null) => {
    if (!dateString) return 'outline';
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'outline';
      
      const daysUntil = differenceInDays(date, new Date());
      
      if (daysUntil <= 1) return 'destructive'; // Today or tomorrow
      if (daysUntil <= 7) return 'default'; // This week
      return 'secondary'; // Later
      
    } catch (e) {
      return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Upcoming Webinars</CardTitle>
          <CardDescription>Your scheduled upcoming webinars</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/webinars')}
        >
          View all
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : upcomingWebinars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-2" />
            <p>No upcoming webinars scheduled</p>
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
                <TableHead>Webinar</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Time</TableHead>
                <TableHead className="hidden lg:table-cell">Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingWebinars.map((webinar) => (
                <TableRow key={webinar.id}>
                  <TableCell className="font-medium">{webinar.topic}</TableCell>
                  <TableCell>
                    <Badge variant={getTimeBadgeVariant(webinar.start_time)}>
                      {formatDate(webinar.start_time)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{formatTime(webinar.start_time)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{webinar.duration ? `${webinar.duration} min` : '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
