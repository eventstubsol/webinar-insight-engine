
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
  Sector
} from 'recharts';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useZoomWebinars } from '@/hooks/zoom';

// Shared color palette for consistency across charts
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
  // Use webinar data from our hook to build real metrics as possible
  const { webinars } = useZoomWebinars();
  
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
  
  const [activeIndex, setActiveIndex] = React.useState(0);
  
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
    <Card>
      <CardHeader>
        <CardTitle>Webinar Analytics</CardTitle>
        <CardDescription>Key metrics from your recent webinars</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="engagement">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="duration">Attendance Duration</TabsTrigger>
            <TabsTrigger value="conversion">Registration Conversion</TabsTrigger>
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
                <Bar dataKey="questions" name="Questions" fill="#9b87f5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="chat" name="Chat Messages" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="polls" name="Poll Responses" fill="#10B981" radius={[4, 4, 0, 0]} />
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
                <Bar dataKey="attendees" name="Attendees" radius={[4, 4, 0, 0]}>
                  {durationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="conversion" className="pt-4">
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
