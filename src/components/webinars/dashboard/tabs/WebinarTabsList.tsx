
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZoomWebinar, ZoomWebinarInstance } from '@/hooks/zoom';

interface WebinarTabsListProps {
  webinar: ZoomWebinar;
  instances?: ZoomWebinarInstance[];
}

export const WebinarTabsList: React.FC<WebinarTabsListProps> = ({
  webinar,
  instances = []
}) => {
  // Only show certain tabs based on webinar status
  const isEnded = webinar.status === 'ended';
  const hasInstances = instances && instances.length > 0;
  
  return (
    <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 w-full h-auto">
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="participants">Participants</TabsTrigger>
      <TabsTrigger value="analytics">Analytics</TabsTrigger>
      <TabsTrigger value="engagement">Engagement</TabsTrigger>
      <TabsTrigger value="reports">Reports</TabsTrigger>
      {hasInstances && <TabsTrigger value="instances">Instances</TabsTrigger>}
      <TabsTrigger value="recordings">Recordings</TabsTrigger>
    </TabsList>
  );
};
