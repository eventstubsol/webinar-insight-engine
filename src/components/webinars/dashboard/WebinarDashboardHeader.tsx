
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { WebinarSyncButton } from '@/components/webinars/WebinarSyncButton';
import { WebinarTimingSyncButton } from '@/components/webinars/WebinarTimingSyncButton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { ZoomWebinar } from '@/hooks/zoom';
import { formatWebinarId } from '@/lib/utils';

interface WebinarDashboardHeaderProps {
  webinar: ZoomWebinar;
}

export const WebinarDashboardHeader: React.FC<WebinarDashboardHeaderProps> = ({ webinar }) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'started':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ended':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const handleRefresh = () => {
    // Refresh the page to reload data
    window.location.reload();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/webinars')}
          className="mt-1"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Webinars
        </Button>
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{webinar.topic}</h1>
            <Badge className={getStatusColor(webinar.status)}>
              {webinar.status || 'Unknown'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Webinar ID: {formatWebinarId(webinar.id)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <WebinarTimingSyncButton
          webinarId={webinar.id}
          webinarStatus={webinar.status}
          onSyncComplete={handleRefresh}
          variant="outline"
        />
        <WebinarSyncButton
          webinarId={webinar.id}
          size="default"
          variant="outline"
        />
        {webinar.join_url && (
          <Button asChild variant="default">
            <a href={webinar.join_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Join Webinar
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};
