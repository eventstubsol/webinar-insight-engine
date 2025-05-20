
import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const data = [
  { name: 'Jan', attendance: 65 },
  { name: 'Feb', attendance: 72 },
  { name: 'Mar', attendance: 58 },
  { name: 'Apr', attendance: 80 },
  { name: 'May', attendance: 74 },
  { name: 'Jun', attendance: 62 },
  { name: 'Jul', attendance: 90 },
  { name: 'Aug', attendance: 81 },
];

export const AttendanceChart = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <CardTitle>Attendance Rate</CardTitle>
            <Badge variant="secondary">Last 8 months</Badge>
          </div>
          <CardDescription>Average webinar attendance rates over time</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Monthly
          </Button>
          <Button variant="ghost" size="sm">
            Yearly
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: 0,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2384ff" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#2384ff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              domain={[0, 100]} 
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              formatter={(value) => [`${value}%`, 'Attendance Rate']} 
              contentStyle={{ 
                backgroundColor: "#ffffff",
                border: "1px solid #f0f0f0", 
                borderRadius: "0.5rem",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
              }}
            />
            <Area 
              type="monotone" 
              dataKey="attendance" 
              stroke="#2384ff" 
              strokeWidth={2}
              fill="url(#attendanceGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
