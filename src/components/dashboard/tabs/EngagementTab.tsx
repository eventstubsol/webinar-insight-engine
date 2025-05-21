
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { EngagementBarChart } from '../charts/EngagementBarChart';

export const EngagementTab = () => {
  return (
    <TabsContent value="engagement" className="pt-4">
      <EngagementBarChart />
    </TabsContent>
  );
};
