
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { DurationBarChart } from '../charts/DurationBarChart';
import { Card, CardContent } from '@/components/ui/card';

export const DurationTab = () => {
  return (
    <TabsContent value="duration" className="pt-4">
      <Card>
        <CardContent className="pt-6">
          <DurationBarChart />
        </CardContent>
      </Card>
    </TabsContent>
  );
};
