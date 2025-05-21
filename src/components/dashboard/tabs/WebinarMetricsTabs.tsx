
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WebinarMetricsTabsProps {
  defaultValue?: string;
}

export const WebinarMetricsTabs = ({ defaultValue = "engagement" }: WebinarMetricsTabsProps) => {
  return (
    <TabsList className="grid w-full grid-cols-3">
      <TabsTrigger value="engagement">Engagement</TabsTrigger>
      <TabsTrigger value="duration">Attendance Duration</TabsTrigger>
      <TabsTrigger value="conversion">Registration Conversion</TabsTrigger>
    </TabsList>
  );
};
