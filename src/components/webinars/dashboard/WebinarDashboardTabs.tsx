
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { WebinarTabsList } from "./tabs/WebinarTabsList";
import { WebinarOverviewTab } from "./tabs/WebinarOverviewTab";
import { WebinarParticipantsTab } from "./tabs/WebinarParticipantsTab";
import { WebinarAnalyticsTab } from "./tabs/WebinarAnalyticsTab";
import { WebinarReportsTab } from "./tabs/WebinarReportsTab";
import { WebinarEngagementTab } from "./tabs/WebinarEngagementTab";
import { WebinarInstancesTab } from "./tabs/WebinarInstancesTab";
import { ZoomWebinar, ZoomParticipants } from "@/hooks/zoom";

interface WebinarDashboardTabsProps {
  webinar: ZoomWebinar;
  participants: ZoomParticipants;
  instances?: any[];
}

export function WebinarDashboardTabs({ webinar, participants, instances = [] }: WebinarDashboardTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <WebinarTabsList />
      
      <TabsContent value="overview" className="space-y-4">
        <WebinarOverviewTab webinar={webinar} participants={participants} />
      </TabsContent>
      
      <TabsContent value="participants" className="space-y-4">
        <WebinarParticipantsTab webinar={webinar} participants={participants} />
      </TabsContent>
      
      <TabsContent value="instances" className="space-y-4">
        <WebinarInstancesTab webinar={webinar} instances={instances} />
      </TabsContent>
      
      <TabsContent value="engagement" className="space-y-4">
        <WebinarEngagementTab webinar={webinar} participants={participants} />
      </TabsContent>
      
      <TabsContent value="analytics" className="space-y-4">
        <WebinarAnalyticsTab webinar={webinar} participants={participants} />
      </TabsContent>
      
      <TabsContent value="reports" className="space-y-4">
        <WebinarReportsTab webinar={webinar} />
      </TabsContent>
    </Tabs>
  );
}
