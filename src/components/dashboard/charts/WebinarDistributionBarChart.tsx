
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { TimeRangeView } from '@/hooks/useWebinarDistribution';

// Color palette for the bars - 12 different colors
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

interface MonthDistribution {
  date: Date;
  monthKey: string;
  month: string;
  year: string;
  monthYear: string;
  total: number;
}

interface WebinarDistributionBarChartProps {
  data: MonthDistribution[];
  timeRange: TimeRangeView;
}

export const WebinarDistributionBarChart: React.FC<WebinarDistributionBarChartProps> = ({ 
  data,
  timeRange
}) => {
  const chartConfig = {
    total: { 
      label: "Webinars", 
      theme: {
        light: "#0EA5E9",
        dark: "#0EA5E9"
      }
    }
  };

  return (
    <ChartContainer
      config={chartConfig}
      className="h-full w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          barSize={40}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" opacity={0.7} />
          <XAxis 
            dataKey="monthYear" 
            tick={{ fontSize: 11, fontFamily: 'inherit', fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
            interval={0} 
          />
          <YAxis 
            allowDecimals={false}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
            tick={{ fontSize: 12, fontFamily: 'inherit', fill: '#64748b' }}
          />
          <Bar 
            dataKey="total" 
            name="Total Webinars" 
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={timeRange === 'past' ? COLOR_PALETTE[index % COLOR_PALETTE.length] : 'none'}
                stroke={timeRange === 'future' ? COLOR_PALETTE[index % COLOR_PALETTE.length] : undefined}
                strokeWidth={timeRange === 'future' ? 2 : undefined}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
