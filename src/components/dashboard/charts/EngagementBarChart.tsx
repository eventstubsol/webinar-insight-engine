
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

// Sample data for engagement metrics
const engagementData = [
  { name: 'Webinar 1', questions: 24, chat: 156, polls: 32, attendance: 85 },
  { name: 'Webinar 2', questions: 18, chat: 98, polls: 42, attendance: 76 },
  { name: 'Webinar 3', questions: 32, chat: 205, polls: 18, attendance: 92 },
  { name: 'Webinar 4', questions: 15, chat: 67, polls: 26, attendance: 64 },
  { name: 'Webinar 5', questions: 27, chat: 189, polls: 38, attendance: 88 },
];

export const EngagementBarChart = () => {
  return (
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
        <Bar dataKey="questions" name="Questions" fill="#9b87f5" radius={[4, 4, 0, 0]} />
        <Bar dataKey="chat" name="Chat Messages" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
        <Bar dataKey="polls" name="Poll Responses" fill="#10B981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
