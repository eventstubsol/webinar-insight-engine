
import { Card, CardContent } from "@/components/ui/card";
import { ZoomWebinar, ZoomParticipants } from "@/hooks/zoom";
import { CalendarDays, Clock, Users, UserCheck } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { Badge } from "@/components/ui/badge";

interface WebinarMetadataHeaderProps {
  webinar: ZoomWebinar;
  participants: ZoomParticipants;
  instances?: any[];
}

export function WebinarMetadataHeader({ webinar, participants, instances = [] }: WebinarMetadataHeaderProps) {
  // Get participant stats
  const registrantsCount = webinar.registrants_count || participants.registrants.length;
  const attendeesCount = webinar.participants_count || participants.attendees.length;
  
  // Determine total instances
  const instancesCount = instances?.length || 0;
  const pastInstancesCount = instances?.filter(i => 
    i.status === 'ended' || new Date(i.start_time) < new Date()
  ).length || 0;
  
  // Format the date and time for display
  const formatDateTime = (dateTimeStr: string) => {
    try {
      if (!dateTimeStr) return 'Not scheduled';
      const date = parseISO(dateTimeStr);
      return format(date, 'PPpp'); // Format: Mar 14, 2023, 2:30 PM
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'started': return 'bg-green-500';
      case 'waiting': return 'bg-yellow-500';
      case 'ended': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Date & Time</h3>
              <p className="text-sm">{formatDateTime(webinar.start_time)}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {webinar.duration} minutes
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(webinar.status)}`}></div>
                <span className="text-sm capitalize">{webinar.status || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Participation</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-2xl font-bold">{registrantsCount}</p>
                  <p className="text-xs text-muted-foreground">Registrants</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{attendeesCount}</p>
                  <p className="text-xs text-muted-foreground">Attendees</p>
                </div>
              </div>
              {(registrantsCount > 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((attendeesCount / registrantsCount) * 100)}% attendance rate
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <UserCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Webinar Details</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm">Type: {webinar.type === 5 ? 'Webinar' : 'Meeting'}</p>
                  <p className="text-sm">Host: {webinar.host_email || 'Unknown'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {instancesCount > 1 && (
                    <Badge variant="outline">{instancesCount} instances</Badge>
                  )}
                  {pastInstancesCount > 0 && (
                    <Badge variant="outline">{pastInstancesCount} past sessions</Badge>
                  )}
                  {webinar.timezone && (
                    <Badge variant="outline">TZ: {webinar.timezone}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
