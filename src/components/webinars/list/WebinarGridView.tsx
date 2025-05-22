
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { WebinarStatusBadge } from './WebinarStatusBadge';
import { WebinarEmptyState } from './WebinarEmptyState';
import { getWebinarStatus } from './webinarHelpers';
import { ZoomWebinar } from '@/hooks/useZoomApi';
import { format } from 'date-fns';
import { Calendar, Clock, Users, Eye, Download, ChartBar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WebinarGridViewProps {
  webinars: ZoomWebinar[];
  selectedWebinars: string[];
  handleWebinarSelection: (webinarId: string) => void;
}

export const WebinarGridView: React.FC<WebinarGridViewProps> = ({ 
  webinars, 
  selectedWebinars,
  handleWebinarSelection
}) => {
  const navigate = useNavigate();

  if (webinars.length === 0) {
    return <WebinarEmptyState isEmpty={true} isFiltered={false} />;
  }

  const handleViewWebinar = (webinarId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/webinars/${webinarId}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {webinars.map((webinar) => {
        const status = getWebinarStatus(webinar);
        const webinarDate = new Date(webinar.start_time);
        
        return (
          <Card 
            key={webinar.id} 
            className="relative h-full cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(`/webinars/${webinar.id}`)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <Checkbox 
                  checked={selectedWebinars.includes(webinar.id)}
                  onCheckedChange={() => handleWebinarSelection(webinar.id)}
                  className="mr-2 mt-1"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="ml-auto">
                  <WebinarStatusBadge status={status} />
                </div>
              </div>
              <CardTitle className="text-lg mt-2 line-clamp-2">
                {webinar.topic}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Webinar ID: {webinar.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{format(webinarDate, 'MMM d, yyyy • h:mm a')}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{webinar.duration} mins</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{webinar.raw_data?.registrants_count || 0} registrants</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={(e) => handleViewWebinar(webinar.id, e)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {status.value === 'ended' && (
                <>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                    <ChartBar className="h-4 w-4" />
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};
