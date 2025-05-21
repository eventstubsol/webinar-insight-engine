
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { ConversionPieChart } from '../charts/ConversionPieChart';

export const ConversionTab = () => {
  return (
    <TabsContent value="conversion" className="pt-4">
      <ConversionPieChart />
    </TabsContent>
  );
};
