
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
  Users,
  Clock,
  Loader2
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { ZoomWebinar } from '@/hooks/useZoomApi';
import { format } from 'date-fns';

interface WebinarStatus {
  value: string;
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
}

const statusMap: Record<string, WebinarStatus> = {
  'available': { value: 'available', label: 'Scheduled', variant: 'outline' },
  'started': { value: 'started', label: 'Live', variant: 'secondary' },
  'ended': { value: 'ended', label: 'Completed', variant: 'default' },
  'cancelled': { value: 'cancelled', label: 'Canceled', variant: 'destructive' },
};

interface WebinarsListProps {
  webinars: ZoomWebinar[];
  isLoading: boolean;
}

export const WebinarsList: React.FC<WebinarsListProps> = ({ webinars = [], isLoading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Filter webinars based on search query
  const filteredWebinars = webinars.filter(webinar => 
    webinar.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
    webinar.host_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredWebinars.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWebinars = filteredWebinars.slice(startIndex, startIndex + itemsPerPage);

  // Helper function to format Zoom webinar status
  const getStatus = (webinar: ZoomWebinar): WebinarStatus => {
    const now = new Date();
    const startTime = new Date(webinar.start_time);
    const endTime = new Date(startTime.getTime() + webinar.duration * 60000);
    
    if (webinar.status === 'cancelled') {
      return statusMap['cancelled'];
    } else if (now < startTime) {
      return statusMap['available'];
    } else if (now >= startTime && now <= endTime) {
      return statusMap['started'];
    } else {
      return statusMap['ended'];
    }
  };

  // Generate array for pagination
  const getPageNumbers = () => {
    const maxVisiblePages = 3;
    let pages = [];
    
    if (totalPages <= maxVisiblePages) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      if (currentPage <= 2) {
        pages = [1, 2, 3];
      } else if (currentPage >= totalPages - 1) {
        pages = [totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [currentPage - 1, currentPage, currentPage + 1];
      }
    }
    
    return pages;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Webinars</CardTitle>
        <CardDescription>Manage and view all your Zoom webinar sessions</CardDescription>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg">Loading webinars...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Webinar</TableHead>
                  <TableHead className="hidden md:table-cell">Date & Time</TableHead>
                  <TableHead className="hidden md:table-cell">Host</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Duration
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWebinars.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {webinars.length === 0 ? 'No webinars found. Connect to Zoom to sync your webinars.' : 'No webinars found matching your search'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedWebinars.map((webinar) => {
                    const status = getStatus(webinar);
                    const webinarDate = new Date(webinar.start_time);
                    
                    return (
                      <TableRow key={webinar.id}>
                        <TableCell className="font-medium">
                          <div>
                            {webinar.topic}
                            <p className="text-muted-foreground text-xs mt-1 line-clamp-1">
                              {webinar.agenda || 'No description provided'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(webinarDate, 'MMM d, yyyy • h:mm a')}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{webinar.host_email}</TableCell>
                        <TableCell className="hidden lg:table-cell">{webinar.duration} mins</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-2">
                            {status.value === 'ended' && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <ChartBar className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
        {filteredWebinars.length > itemsPerPage && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {getPageNumbers().map(page => (
                  <PaginationItem key={page}>
                    <PaginationLink 
                      href="#" 
                      isActive={currentPage === page}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
