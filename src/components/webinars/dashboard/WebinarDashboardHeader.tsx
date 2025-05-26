
import React from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ZoomWebinar } from '@/hooks/zoom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Calendar, Clock, Download, Share2 } from 'lucide-react';
import { WebinarStatusBadge } from '@/components/webinars/list/WebinarStatusBadge';
import { WebinarSyncButton } from '@/components/webinars/WebinarSyncButton';
import { getWebinarStatus } from '@/components/webinars/list/webinarHelpers';
import { extractHostInfo, formatHostDisplay } from './utils/hostDisplayUtils';

interface WebinarDashboardHeaderProps {
  webinar: ZoomWebinar;
}

export const WebinarDashboardHeader: React.FC<WebinarDashboardHeaderProps> = ({ 
  webinar 
}) => {
  const status = getWebinarStatus(webinar);
  const formattedDate = webinar.start_time ? 
    format(parseISO(webinar.start_time), 'EEEE, MMMM d, yyyy • h:mm a') : 
    'Date not set';

  // Extract and format host information
  const hostInfo = extractHostInfo(webinar);
  const formattedHost = formatHostDisplay(hostInfo);

  return (
    <div className="space-y-4">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link 
          to="/webinars"
          className="flex items-center hover:text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to webinars
        </Link>
        <span>•</span>
        <span>Webinar ID: {webinar.id}</span>
      </div>
      
      {/* Main header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{webinar.topic}</h1>
        <div className="flex flex-wrap gap-2">
          <WebinarSyncButton 
            webinarId={webinar.id} 
            showLastSync={true}
            className="order-first"
          />
          <Button size="sm" variant="outline" className="gap-1">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button size="sm" variant="outline" className="gap-1">
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
        </div>
      </div>
      
      {/* Webinar meta information */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <WebinarStatusBadge status={status} />
        <div className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{webinar.duration} minutes</span>
        </div>
        {webinar.host_email && (
          <div className="flex items-center gap-1">
            <span className="font-medium">Host:</span>
            <span>{formattedHost}</span>
          </div>
        )}
      </div>
    </div>
  );
};
