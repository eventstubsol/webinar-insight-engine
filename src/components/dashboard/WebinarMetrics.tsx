
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const engagementData = [
  { name: 'Webinar 1', questions: 24, chat: 156, polls: 32, attendance: 85 },
  { name: 'Webinar 2', questions: 18, chat: 98, polls: 42, attendance: 76 },
  { name: 'Webinar 3', questions: 32, chat: 205, polls: 18, attendance: 92 },
  { name: 'Webinar 4', questions: 15, chat: 67, polls: 26, attendance: 64 },
  { name: 'Webinar 5', questions: 27, chat: 189, polls: 38, attendance: 88 },
];

const durationData = [
  { name: '<15 mins', attendees: 42 },
  { name: '15-30 mins', attendees: 78 },
  { name: '30-45 mins', attendees: 123 },
  { name: '45-60 mins', attendees: 87 },
  { name: '>60 mins', attendees: 36 },
];

export const WebinarMetrics = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Webinar Analytics</CardTitle>
        <CardDescription>Key metrics from your recent webinars</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="engagement">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="duration">Attendance Duration</TabsTrigger>
          </TabsList>
          <TabsContent value="engagement" className="pt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={engagementData}
                margin={{
                  top: 5,
                  right: 10,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#ffffff",
                    border: "1px solid #f0f0f0", 
                    borderRadius: "0.5rem",
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
                  }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="questions" name="Questions" fill="hsl(var(--chart-completed))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="chat" name="Chat Messages" fill="hsl(var(--chart-registrants))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="polls" name="Poll Responses" fill="hsl(var(--chart-attendees))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="duration" className="pt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={durationData}
                margin={{
                  top: 5,
                  right: 10,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#ffffff",
                    border: "1px solid #f0f0f0", 
                    borderRadius: "0.5rem",
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
                  }}
                />
                <Bar dataKey="attendees" name="Attendees" fill="hsl(var(--chart-completed))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
