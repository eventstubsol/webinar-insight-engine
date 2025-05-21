
import React, { useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Tooltip, 
  ResponsiveContainer,
  Sector 
} from 'recharts';
import { useZoomWebinars } from '@/hooks/zoom';

export const ConversionPieChart = () => {
  const { webinars } = useZoomWebinars();
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Calculate registration vs attendance ratio data
  const conversionData = React.useMemo(() => {
    // Start with some sample data in case there's no real data
    const sampleData = [
      { name: 'Registered', value: 0, fill: '#1EAEDB' },
      { name: 'Attended', value: 0, fill: '#10B981' },
      { name: 'No-Shows', value: 0, fill: '#cbd5e1' }
    ];
    
    // If we have webinars with attendance data, use that
    let totalRegistrants = 0;
    let totalAttendees = 0;
    
    // Collect real attendance data from webinars if available
    webinars.forEach(webinar => {
      let registrants = 0;
      let attendees = 0;
      
      if (webinar.raw_data && typeof webinar.raw_data === 'object') {
        registrants = webinar.raw_data.registrants_count || 0;
        attendees = webinar.raw_data.participants_count || 0;
      } else {
        registrants = webinar.registrants_count || 0;
        attendees = webinar.participants_count || 0;
      }
      
      totalRegistrants += registrants;
      totalAttendees += attendees;
    });
    
    // Only update sample data if we actually have real data
    if (totalRegistrants > 0) {
      const noShows = totalRegistrants - totalAttendees;
      
      return [
        { name: 'Attended', value: totalAttendees, fill: '#10B981' }, // Green
        { name: 'No-Shows', value: noShows > 0 ? noShows : 0, fill: '#cbd5e1' } // Gray
      ];
    }
    
    return sampleData;
  }, [webinars]);
  
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value } = props;
  
    return (
      <g>
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#888888">{payload.name}</text>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} fontSize={20} fontWeight={600}>
          {value}
        </text>
        <text x={cx} y={cy} dy={30} textAnchor="middle" fill="#888888">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          data={conversionData}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={90}
          fill="#8884d8"
          dataKey="value"
          onMouseEnter={onPieEnter}
        />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};
