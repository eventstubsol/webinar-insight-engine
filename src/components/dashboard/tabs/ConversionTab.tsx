
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { ConversionPieChart } from '../charts/ConversionPieChart';
import { Card, CardContent } from '@/components/ui/card';

export const ConversionTab = () => {
  return (
    <TabsContent value="conversion" className="pt-4">
      <Card>
        <CardContent className="pt-6">
          <ConversionPieChart />
        </CardContent>
      </Card>
    </TabsContent>
  );
};
