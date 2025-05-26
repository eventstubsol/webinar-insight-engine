
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ZoomWebinar } from '@/hooks/zoom';
import { WebinarSyncButton } from '../WebinarSyncButton';
import { SyncTimingDataButton } from '../SyncTimingDataButton';

interface WebinarDashboardHeaderProps {
  webinar: ZoomWebinar;
}

export const WebinarDashboardHeader: React.FC<WebinarDashboardHeaderProps> = ({ webinar }) => {
  const navigate = useNavigate();

  const handleRefresh = () => {
    // Force page refresh to get updated data
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-between border-b pb-4">
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
        {/* Sync timing data button for ended webinars */}
        {webinar.status === 'ended' && (
          <SyncTimingDataButton 
            onSyncComplete={handleRefresh}
            variant="outline"
            size="sm"
          />
        )}
        
        {/* Individual webinar sync button */}
        <WebinarSyncButton 
          webinarId={webinar.id}
          variant="outline"
          size="sm"
          showLastSync={true}
        />
      </div>
    </div>
  );
};
