
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, UserPlus, ExternalLink } from 'lucide-react';
import { ZoomWebinar } from '@/hooks/zoom';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface WebinarCardProps {
  webinar: ZoomWebinar;
}

export const WebinarCard: React.FC<WebinarCardProps> = ({ webinar }) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'started':
        return 'bg-green-500';
      case 'ended':
        return 'bg-gray-500';
      case 'waiting':
        return 'bg-blue-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const handleViewDetails = () => {
    navigate(`/webinars/${webinar.webinar_id}`);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg leading-6 mb-2">{webinar.topic}</CardTitle>
            <CardDescription className="line-clamp-2">
              {webinar.agenda || 'No agenda provided'}
            </CardDescription>
          </div>
          <Badge className={`${getStatusColor(webinar.status)} text-white ml-2`}>
            {webinar.status || 'scheduled'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {webinar.start_time 
                ? format(new Date(webinar.start_time), 'MMM d, yyyy')
                : 'TBD'
              }
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {webinar.start_time 
                ? format(new Date(webinar.start_time), 'h:mm a')
                : 'TBD'
              }
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{webinar.participants_count || 0} attended</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <span>{webinar.registrants_count || 0} registered</span>
          </div>
        </div>

        {webinar.duration && (
          <div className="text-sm text-muted-foreground">
            Duration: {webinar.duration} minutes
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleViewDetails} className="flex-1">
            <ExternalLink className="h-4 w-4 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
