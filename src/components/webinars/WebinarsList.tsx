
import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChartBar, 
  Download, 
  Eye, 
  Filter, 
  Search,
  Calendar,
  Users
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";

interface Webinar {
  id: string;
  title: string;
  description: string;
  date: string;
  host: string;
  attendees: number;
  registrations: number;
  duration: number; // in minutes
  status: 'completed' | 'processing' | 'scheduled' | 'canceled';
}

const mockWebinars: Webinar[] = [
  { 
    id: 'web-001', 
    title: 'Introduction to ZoomLytics', 
    description: 'Learn how to use ZoomLytics to analyze your webinar data',
    date: '2023-05-18', 
    host: 'John Doe', 
    attendees: 156, 
    registrations: 243,
    duration: 60,
    status: 'completed'
  },
  { 
    id: 'web-002', 
    title: 'Advanced Data Sanitization Techniques', 
    description: 'Deep dive into data cleaning and preparation',
    date: '2023-05-20', 
    host: 'Jane Smith', 
    attendees: 89, 
    registrations: 124,
    duration: 45,
    status: 'completed'
  },
  { 
    id: 'web-003', 
    title: 'Analyzing Webinar Engagement', 
    description: 'How to measure and improve audience engagement',
    date: '2023-05-22', 
    host: 'Mike Johnson', 
    attendees: 212, 
    registrations: 256,
    duration: 90,
    status: 'processing'
  },
  { 
    id: 'web-004', 
    title: 'Q2 Team Updates', 
    description: 'Quarterly update for the team',
    date: '2023-05-25', 
    host: 'Sarah Williams', 
    attendees: 0, 
    registrations: 45,
    duration: 30,
    status: 'scheduled'
  },
  { 
    id: 'web-005', 
    title: 'Product Roadmap Discussion', 
    description: 'Overview of upcoming features and timeline',
    date: '2023-05-27', 
    host: 'David Brown', 
    attendees: 0, 
    registrations: 78,
    duration: 60,
    status: 'scheduled'
  },
  { 
    id: 'web-006', 
    title: 'Marketing Strategy Workshop', 
    description: 'Collaborative session on Q3 marketing initiatives',
    date: '2023-05-19', 
    host: 'Emily Chen', 
    attendees: 45, 
    registrations: 50,
    duration: 120,
    status: 'completed'
  },
  { 
    id: 'web-007', 
    title: 'Customer Feedback Session', 
    description: 'Live Q&A with users about recent product changes',
    date: '2023-05-28', 
    host: 'Robert Taylor', 
    attendees: 0, 
    registrations: 120,
    duration: 60,
    status: 'scheduled'
  },
  { 
    id: 'web-008', 
    title: 'New Feature Training', 
    description: 'How to use the new analytics dashboard',
    date: '2023-05-15', 
    host: 'Amanda Jones', 
    attendees: 198, 
    registrations: 220,
    duration: 45,
    status: 'completed'
  },
];

export const WebinarsList = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredWebinars = mockWebinars.filter(webinar => 
    webinar.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    webinar.host.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Webinars</CardTitle>
        <CardDescription>Manage and view all your webinar sessions</CardDescription>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search webinars..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="flex items-center gap-1">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Webinar</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Host</TableHead>
                <TableHead className="hidden lg:table-cell">
                  <Users className="h-4 w-4 inline mr-1" />
                  Attendees
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Duration
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWebinars.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No webinars found matching your search
                  </TableCell>
                </TableRow>
              ) : (
                filteredWebinars.map((webinar) => (
                  <TableRow key={webinar.id}>
                    <TableCell className="font-medium">
                      <div>
                        {webinar.title}
                        <p className="text-muted-foreground text-xs mt-1 line-clamp-1">{webinar.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{webinar.date}</TableCell>
                    <TableCell className="hidden md:table-cell">{webinar.host}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {webinar.status === 'scheduled' ? '—' : (
                        <>
                          {webinar.attendees}
                          <span className="text-muted-foreground text-xs">
                            /{webinar.registrations}
                          </span>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{webinar.duration} mins</TableCell>
                    <TableCell>
                      <Badge variant={
                        webinar.status === 'completed' ? 'default' :
                        webinar.status === 'processing' ? 'secondary' :
                        webinar.status === 'scheduled' ? 'outline' : 'destructive'
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">2</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
};
