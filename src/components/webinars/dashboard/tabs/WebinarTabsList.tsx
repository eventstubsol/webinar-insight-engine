
import React from 'react';
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export function WebinarTabsList() {
  return (
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="participants">Participants</TabsTrigger>
      <TabsTrigger value="instances">Instances</TabsTrigger>
      <TabsTrigger value="engagement">Engagement</TabsTrigger>
      <TabsTrigger value="analytics">Analytics</TabsTrigger>
      <TabsTrigger value="reports">Reports</TabsTrigger>
    </TabsList>
  );
}
