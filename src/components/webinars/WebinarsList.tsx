import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
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
import { AlertCircle, ChevronRight } from 'lucide-react';
import { 
  ChartBar, 
  Download, 
  Eye, 
  Filter, 
  Search,
  Calendar,
  Users,
  Clock,
  Loader2,
  CheckCircle
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { ZoomWebinar } from '@/hooks/useZoomApi';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  error?: Error | null;
  viewMode: 'list' | 'grid';
  filterTab: string;
}

export const WebinarsList: React.FC<WebinarsListProps> = ({ webinars = [], isLoading, error, viewMode, filterTab }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWebinars, setSelectedWebinars] = useState<string[]>([]);
  const itemsPerPage = viewMode === 'grid' ? 12 : 10;
  
  // Filter webinars based on search query
  let filteredWebinars = webinars.filter(webinar => 
    webinar.topic?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    webinar.host_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Filter webinars based on the selected tab
  if (filterTab !== 'all') {
    filteredWebinars = filteredWebinars.filter(webinar => {
      const status = getStatus(webinar);
      
      switch(filterTab) {
        case 'upcoming':
          return status.value === 'available';
        case 'past':
          return status.value === 'ended';
        case 'drafts':
          // Assuming drafts might be a specific status you want to add
          return false; // Currently no draft status in our data model
        default:
          return true;
      }
    });
  }

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

  // Handle checkbox selection of webinars
  const handleWebinarSelection = (webinarId: string) => {
    setSelectedWebinars(prev => {
      if (prev.includes(webinarId)) {
        return prev.filter(id => id !== webinarId);
      } else {
        return [...prev, webinarId];
      }
    });
  };

  // Handle "select all" functionality
  const handleSelectAll = () => {
    if (selectedWebinars.length === paginatedWebinars.length) {
      // If all are selected, deselect all
      setSelectedWebinars([]);
    } else {
      // Otherwise select all
      setSelectedWebinars(paginatedWebinars.map(webinar => webinar.id));
    }
  };

  const renderErrorState = () => (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error loading webinars</AlertTitle>
      <AlertDescription>
        {error?.message || 'Failed to load webinars from Zoom. Please check your Zoom API configuration in the Supabase dashboard.'}
      </AlertDescription>
      <AlertDescription className="mt-2 text-xs">
        You need to configure a Server-to-Server OAuth app in Zoom Marketplace with the proper scopes (webinar:read, webinar:write).
        Make sure ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET are properly set in your Supabase Edge Functions secrets.
      </AlertDescription>
    </Alert>
  );

  const renderGridView = () => {
    if (paginatedWebinars.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {webinars.length === 0 ? 'No webinars found. Connect to Zoom to sync your webinars.' : 'No webinars found matching your criteria'}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedWebinars.map((webinar) => {
          const status = getStatus(webinar);
          const webinarDate = new Date(webinar.start_time);
          
          return (
            <Card key={webinar.id} className="relative h-full">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Checkbox 
                    checked={selectedWebinars.includes(webinar.id)}
                    onCheckedChange={() => handleWebinarSelection(webinar.id)}
                    className="mr-2 mt-1"
                  />
                  <Badge variant={status.variant} className="ml-auto">
                    {status.label}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-2 line-clamp-2">
                  {webinar.topic}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Webinar ID: {webinar.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{format(webinarDate, 'MMM d, yyyy • h:mm a')}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{webinar.duration} mins</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{webinar.raw_data?.registrants_count || 0} registrants</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2 flex justify-end">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Eye className="h-4 w-4" />
                </Button>
                {status.value === 'ended' && (
                  <>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChartBar className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]">
                <Checkbox 
                  checked={selectedWebinars.length === paginatedWebinars.length && paginatedWebinars.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[200px]">Webinar</TableHead>
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {webinars.length === 0 ? 'No webinars found. Connect to Zoom to sync your webinars.' : 'No webinars found matching your search'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedWebinars.map((webinar) => {
                const status = getStatus(webinar);
                const webinarDate = new Date(webinar.start_time);
                
                return (
                  <TableRow key={webinar.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedWebinars.includes(webinar.id)}
                        onCheckedChange={() => handleWebinarSelection(webinar.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        {webinar.topic}
                        <p className="text-muted-foreground text-xs mt-1 line-clamp-1">
                          ID: {webinar.id}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(webinarDate, 'MMM d, yyyy • h:mm a')}
                      <p className="text-xs text-muted-foreground">{webinar.timezone}</p>
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
      </div>
    );
  };

  return (
    <>
      {error && renderErrorState()}
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading webinars...</span>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? renderGridView() : renderListView()}
          
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
        </>
      )}
    </>
  );
};
