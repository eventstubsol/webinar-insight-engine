
import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { RecentWebinars } from '@/components/dashboard/RecentWebinars';
import { WebinarMetrics } from '@/components/dashboard/WebinarMetrics';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's an overview of your analytics.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              Import Data
            </Button>
            <Button>
              Connect Zoom
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <DashboardStats />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AttendanceChart />
            <WebinarMetrics />
          </div>
          
          <RecentWebinars />
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
