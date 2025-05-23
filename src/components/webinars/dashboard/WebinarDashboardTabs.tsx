
import React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { WebinarTabsList } from './tabs/WebinarTabsList';
import { WebinarOverviewTab } from './tabs/WebinarOverviewTab';
import { WebinarParticipantsTab } from './tabs/WebinarParticipantsTab';
import { WebinarAnalyticsTab } from './tabs/WebinarAnalyticsTab';
import { WebinarEngagementTab } from './tabs/WebinarEngagementTab';
import { WebinarReportsTab } from './tabs/WebinarReportsTab';
import { WebinarInstancesTab } from './tabs/WebinarInstancesTab';
import { WebinarRecordingsTab } from './tabs/WebinarRecordingsTab';
import { ZoomWebinar, ZoomParticipants, ZoomWebinarInstance } from '@/hooks/zoom';

interface WebinarDashboardTabsProps {
  webinar: ZoomWebinar;
  participants: ZoomParticipants;
  instances?: ZoomWebinarInstance[];
}

export const WebinarDashboardTabs: React.FC<WebinarDashboardTabsProps> = ({
  webinar,
  participants,
  instances = []
}) => {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <WebinarTabsList webinar={webinar} instances={instances} />
      
      <TabsContent value="overview" className="space-y-4">
        <WebinarOverviewTab webinar={webinar} participants={participants} />
      </TabsContent>
      
      <TabsContent value="participants" className="space-y-4">
        <WebinarParticipantsTab webinar={webinar} participants={participants} />
      </TabsContent>
      
      <TabsContent value="analytics" className="space-y-4">
        <WebinarAnalyticsTab webinar={webinar} participants={participants} />
      </TabsContent>
      
      <TabsContent value="engagement" className="space-y-4">
        <WebinarEngagementTab webinar={webinar} participants={participants} />
      </TabsContent>
      
      <TabsContent value="reports" className="space-y-4">
        <WebinarReportsTab webinar={webinar} />
      </TabsContent>
      
      {instances && instances.length > 0 && (
        <TabsContent value="instances" className="space-y-4">
          <WebinarInstancesTab webinar={webinar} instances={instances} />
        </TabsContent>
      )}
      
      <TabsContent value="recordings" className="space-y-4">
        <WebinarRecordingsTab webinar={webinar} />
      </TabsContent>
    </Tabs>
  );
};
