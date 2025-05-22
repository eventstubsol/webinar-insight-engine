
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { WebinarOverviewTab } from './tabs/WebinarOverviewTab';
import { WebinarParticipantsTab } from './tabs/WebinarParticipantsTab';
import { WebinarAnalyticsTab } from './tabs/WebinarAnalyticsTab';
import { WebinarReportsTab } from './tabs/WebinarReportsTab';

interface WebinarDashboardTabsProps {
  webinar: ZoomWebinar;
  participants: ZoomParticipants;
}

export const WebinarDashboardTabs: React.FC<WebinarDashboardTabsProps> = ({
  webinar,
  participants
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full max-w-lg grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="participants">Participants</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="mt-6">
        <WebinarOverviewTab webinar={webinar} participants={participants} />
      </TabsContent>
      
      <TabsContent value="participants" className="mt-6">
        <WebinarParticipantsTab webinar={webinar} participants={participants} />
      </TabsContent>
      
      <TabsContent value="analytics" className="mt-6">
        <WebinarAnalyticsTab webinar={webinar} participants={participants} />
      </TabsContent>
      
      <TabsContent value="reports" className="mt-6">
        <WebinarReportsTab webinar={webinar} />
      </TabsContent>
    </Tabs>
  );
};
