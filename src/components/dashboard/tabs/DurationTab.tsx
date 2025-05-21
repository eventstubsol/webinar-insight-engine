
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { DurationBarChart } from '../charts/DurationBarChart';

export const DurationTab = () => {
  return (
    <TabsContent value="duration" className="pt-4">
      <DurationBarChart />
    </TabsContent>
  );
};
