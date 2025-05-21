
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

// Shared color palette
const COLOR_PALETTE = [
  '#9b87f5', // Primary Purple
  '#7E69AB', // Secondary Purple
  '#6E59A5', // Tertiary Purple
  '#8B5CF6', // Vivid Purple
  '#D946EF', // Magenta Pink
  '#F97316', // Bright Orange
  '#0EA5E9', // Ocean Blue
  '#1EAEDB', // Bright Blue
  '#33C3F0', // Sky Blue
  '#ea384c', // Red
  '#6366F1', // Indigo
  '#10B981'  // Emerald
];

// Sample data for duration metrics
const durationData = [
  { name: '<15 mins', attendees: 42 },
  { name: '15-30 mins', attendees: 78 },
  { name: '30-45 mins', attendees: 123 },
  { name: '45-60 mins', attendees: 87 },
  { name: '>60 mins', attendees: 36 },
];

export const DurationBarChart = () => {
  return (
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
        <Bar dataKey="attendees" name="Attendees" radius={[4, 4, 0, 0]}>
          {durationData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
