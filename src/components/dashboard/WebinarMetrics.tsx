
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { WebinarMetricsTabs } from './tabs/WebinarMetricsTabs';
import { EngagementTab } from './tabs/EngagementTab';
import { DurationTab } from './tabs/DurationTab';
import { ConversionTab } from './tabs/ConversionTab';

export const WebinarMetrics = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Webinar Analytics</CardTitle>
        <CardDescription>Key metrics from your recent webinars</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="engagement">
          <WebinarMetricsTabs />
          <EngagementTab />
          <DurationTab />
          <ConversionTab />
        </Tabs>
      </CardContent>
    </Card>
  );
};
