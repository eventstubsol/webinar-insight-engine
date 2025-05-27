
import React from 'react';
import { ZoomWebinar } from '@/hooks/zoom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WebinarInformationSectionProps {
  webinar: ZoomWebinar;
}

export const WebinarInformationSection: React.FC<WebinarInformationSectionProps> = ({
  webinar
}) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const renderDurationField = () => {
    const hasDuration = webinar.actual_duration !== null && webinar.actual_duration !== undefined;
    const isCompleted = webinar.status === 'ended' || webinar.status === 'stopped';
    
    if (hasDuration) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-gray-900">{formatDuration(webinar.actual_duration)}</span>
          <Badge variant="default">Actual</Badge>
        </div>
      );
    }
    
    if (isCompleted) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Duration missing</span>
          <Badge variant="secondary">Needs Enhancement</Badge>
        </div>
      );
    }
    
    // For future webinars, show planned duration
    if (webinar.duration) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-gray-700">{formatDuration(webinar.duration)}</span>
          <Badge variant="outline">Planned</Badge>
        </div>
      );
    }
    
    return <span className="text-gray-500">Not set</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Webinar Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500 mb-1">Topic</dt>
            <dd className="text-sm text-gray-900">{webinar.topic}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 mb-1">Status</dt>
            <dd className="text-sm text-gray-900">{webinar.status}</dd>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500 mb-1">Start Time</dt>
            <dd className="text-sm text-gray-900">{webinar.start_time}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 mb-1">Timezone</dt>
            <dd className="text-sm text-gray-900">{webinar.timezone}</dd>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Duration field with enhancement status */}
          <div>
            <dt className="text-sm font-medium text-gray-500 mb-1">Duration</dt>
            <dd className="text-sm">
              {renderDurationField()}
            </dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500 mb-1">Type</dt>
            <dd className="text-sm text-gray-900">{webinar.type}</dd>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
