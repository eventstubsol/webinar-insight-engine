
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ZoomWebinar } from '@/hooks/zoom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { WebinarSyncButton } from '../WebinarSyncButton';

interface WebinarDashboardHeaderProps {
  webinar: ZoomWebinar;
}

export const WebinarDashboardHeader: React.FC<WebinarDashboardHeaderProps> = ({ webinar }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/webinars')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Webinars
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{webinar.topic}</h1>
          <p className="text-muted-foreground">Webinar ID: {webinar.id}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <WebinarSyncButton 
          webinarId={webinar.id}
          webinarUuid={webinar.webinar_uuid || webinar.uuid}
          size="sm"
          variant="outline"
          showLastSync={true}
          includeTimingData={true}
        />
      </div>
    </div>
  );
};
