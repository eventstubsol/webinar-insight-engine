
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowDown, ArrowUp, Calendar, ChartBar, Filter, PieChart } from 'lucide-react';

interface StatProps {
  title: string;
  value: string;
  description: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
}

const Stat = ({ title, value, description, trend, icon }: StatProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center space-x-2">
          <CardDescription>{description}</CardDescription>
          {trend && (
            <div className={`flex items-center text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {trend.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const DashboardStats = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat
        title="Total Webinars"
        value="24"
        description="Last 30 days"
        icon={<Calendar className="h-4 w-4" />}
        trend={{
          value: 12,
          isPositive: true
        }}
      />
      <Stat
        title="Attendance Rate"
        value="68%"
        description="Average across webinars"
        icon={<PieChart className="h-4 w-4" />}
        trend={{
          value: 5,
          isPositive: true
        }}
      />
      <Stat
        title="Engagement Score"
        value="7.4"
        description="Out of 10"
        icon={<ChartBar className="h-4 w-4" />}
        trend={{
          value: 2,
          isPositive: false
        }}
      />
      <Stat
        title="Data Quality"
        value="92%"
        description="Sanitization rate"
        icon={<Filter className="h-4 w-4" />}
      />
    </div>
  );
};
