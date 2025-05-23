
import React from 'react';
import { BarChartIcon, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { WebinarStatsItem, MonthlyAttendanceData } from './RegistrationAttendanceUtils';
import RegistrationAttendanceTooltip from './RegistrationAttendanceTooltip';

interface RegistrationAttendanceContentProps {
  webinarStats: WebinarStatsItem[];
  isLoading: boolean;
}

export const RegistrationAttendanceContent: React.FC<RegistrationAttendanceContentProps> = ({
  webinarStats,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (webinarStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-center">
        <BarChartIcon className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No webinar data available</p>
        <p className="text-xs text-muted-foreground">
          Once your past webinars are synced, attendance data will appear here
        </p>
      </div>
    );
  }
  
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={webinarStats}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="registrantsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="attendeesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" opacity={0.7} />
          <XAxis 
            dataKey="month" 
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
            tick={{ fontSize: 11, fontFamily: 'inherit', fill: '#64748b' }}
            interval={0}
          />
          <YAxis 
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
            tick={{ fontSize: 12, fontFamily: 'inherit', fill: '#64748b' }}
          />
          <Tooltip content={<RegistrationAttendanceTooltip />} />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="registrants" 
            name="Registrants" 
            stroke="#3b82f6" 
            fill="url(#registrantsGradient)" 
            strokeWidth={2}
            stackId="1"
          />
          <Area 
            type="monotone" 
            dataKey="attendees" 
            name="Attendees" 
            stroke="#10b981" 
            fill="url(#attendeesGradient)" 
            strokeWidth={2}
            stackId="2"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RegistrationAttendanceContent;
