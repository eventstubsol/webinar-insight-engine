
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { EngagementBarChart } from '../charts/EngagementBarChart';
import { Card, CardContent } from '@/components/ui/card';

export const EngagementTab = () => {
  return (
    <TabsContent value="engagement" className="pt-4">
      <Card>
        <CardContent className="pt-6">
          <EngagementBarChart />
        </CardContent>
      </Card>
    </TabsContent>
  );
};
