
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartBar, Download, Eye } from 'lucide-react';

interface Webinar {
  id: string;
  title: string;
  date: string;
  host: string;
  attendees: number;
  registrations: number;
  status: 'completed' | 'processing' | 'scheduled';
}

const mockWebinars: Webinar[] = [
  { 
    id: 'web-001', 
    title: 'Introduction to ZoomLytics', 
    date: '2023-05-18', 
    host: 'John Doe', 
    attendees: 156, 
    registrations: 243,
    status: 'completed'
  },
  { 
    id: 'web-002', 
    title: 'Advanced Data Sanitization Techniques', 
    date: '2023-05-20', 
    host: 'Jane Smith', 
    attendees: 89, 
    registrations: 124,
    status: 'completed'
  },
  { 
    id: 'web-003', 
    title: 'Analyzing Webinar Engagement', 
    date: '2023-05-22', 
    host: 'Mike Johnson', 
    attendees: 212, 
    registrations: 256,
    status: 'processing'
  },
  { 
    id: 'web-004', 
    title: 'Q2 Team Updates', 
    date: '2023-05-25', 
    host: 'Sarah Williams', 
    attendees: 0, 
    registrations: 45,
    status: 'scheduled'
  },
];

export const RecentWebinars = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Webinars</CardTitle>
          <CardDescription>An overview of your recent webinar data</CardDescription>
        </div>
        <Button variant="outline" size="sm">View all</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Webinar</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="hidden md:table-cell">Host</TableHead>
              <TableHead className="hidden lg:table-cell">Attendees</TableHead>
              <TableHead className="hidden lg:table-cell">Registration Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockWebinars.map((webinar) => (
              <TableRow key={webinar.id}>
                <TableCell className="font-medium">{webinar.title}</TableCell>
                <TableCell>{webinar.date}</TableCell>
                <TableCell className="hidden md:table-cell">{webinar.host}</TableCell>
                <TableCell className="hidden lg:table-cell">{webinar.status === 'scheduled' ? '—' : webinar.attendees}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {webinar.status === 'scheduled' ? '—' : `${Math.round((webinar.attendees / webinar.registrations) * 100)}%`}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    webinar.status === 'completed' ? 'default' :
                    webinar.status === 'processing' ? 'secondary' : 'outline'
                  }>
                    {webinar.status.charAt(0).toUpperCase() + webinar.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-2">
                    {webinar.status !== 'scheduled' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {webinar.status === 'completed' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChartBar className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
