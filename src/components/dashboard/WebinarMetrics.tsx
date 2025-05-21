
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="duration">Attendance Duration</TabsTrigger>
            <TabsTrigger value="conversion">Registration Conversion</TabsTrigger>
          </TabsList>
          <EngagementTab />
          <DurationTab />
          <ConversionTab />
        </Tabs>
      </CardContent>
    </Card>
  );
};
