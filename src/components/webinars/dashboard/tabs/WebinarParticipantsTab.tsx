
import React, { useState, useMemo, useEffect } from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { Search, Download, AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface WebinarParticipantsTabProps {
  webinar: ZoomWebinar;
  participants: ZoomParticipants;
}

type Registrant = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  create_time: string;
  join_url: string;
  status: string;
};

type Attendee = {
  id: string;
  name: string;
  user_email: string;
  join_time: string;
  leave_time: string;
  duration: number;
};

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 per page' },
  { value: '50', label: '50 per page' },
  { value: '100', label: '100 per page' },
  { value: '500', label: '500 per page' },
  { value: 'all', label: 'All' }
];

// Helper function to generate page numbers for pagination
const getPageNumbers = (currentPage: number, totalPages: number) => {
  const pages = [];
  const maxVisiblePages = 5;
  
  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 3) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        pages.push(i);
      }
    }
  }
  
  return pages;
};

export const WebinarParticipantsTab: React.FC<WebinarParticipantsTabProps> = ({
  webinar,
  participants
}) => {
  const [participantType, setParticipantType] = useState('registrants');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState('10');
  
  // Explicitly type cast to handle each type correctly
  const registrants = participants.registrants as Registrant[] || [];
  const attendees = participants.attendees as Attendee[] || [];
  
  // Determine webinar completion status
  const now = new Date();
  const startTime = new Date(webinar.start_time);
  const estimatedEndTime = new Date(startTime.getTime() + (webinar.duration || 60) * 60 * 1000);
  const isCompleted = webinar.status === 'ended' || 
                     webinar.status === 'aborted' ||
                     (startTime < now && estimatedEndTime < now);

  // Use the appropriate array based on the selected tab
  const displayParticipants = participantType === 'registrants' ? registrants : attendees;
    
  const filteredParticipants = useMemo(() => {
    if (searchQuery === '') return displayParticipants;
    
    return displayParticipants.filter(p => {
      if (participantType === 'registrants') {
        const registrant = p as Registrant;
        return (
          (registrant.email && registrant.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (registrant.first_name && registrant.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (registrant.last_name && registrant.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      } else {
        const attendee = p as Attendee;
        return (
          (attendee.user_email && attendee.user_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (attendee.name && attendee.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
    });
  }, [displayParticipants, searchQuery, participantType]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [participantType, searchQuery, itemsPerPage]);

  // Calculate pagination
  const totalParticipants = filteredParticipants.length;
  const isShowingAll = itemsPerPage === 'all';
  const itemsPerPageNum = isShowingAll ? totalParticipants : parseInt(itemsPerPage);
  const totalPages = isShowingAll ? 1 : Math.max(1, Math.ceil(totalParticipants / itemsPerPageNum));
  
  // Ensure currentPage is within valid bounds
  const validCurrentPage = useMemo(() => {
    if (currentPage > totalPages) return Math.max(1, totalPages);
    if (currentPage < 1) return 1;
    return currentPage;
  }, [currentPage, totalPages]);

  // Update currentPage if it's out of bounds
  useEffect(() => {
    if (validCurrentPage !== currentPage) {
      setCurrentPage(validCurrentPage);
    }
  }, [validCurrentPage, currentPage]);

  // Calculate paginated participants
  const paginatedParticipants = useMemo(() => {
    if (isShowingAll) return filteredParticipants;
    
    const startIndex = (validCurrentPage - 1) * itemsPerPageNum;
    return filteredParticipants.slice(startIndex, startIndex + itemsPerPageNum);
  }, [filteredParticipants, validCurrentPage, itemsPerPageNum, isShowingAll]);

  // Calculate display info
  const startIndex = isShowingAll ? 1 : (validCurrentPage - 1) * itemsPerPageNum + 1;
  const endIndex = isShowingAll ? totalParticipants : Math.min(validCurrentPage * itemsPerPageNum, totalParticipants);
  
  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">Webinar Participants</h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="gap-1">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Show status alerts */}
      {!isCompleted && (
        <Alert className="mb-4">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            This webinar is still active or hasn't started yet. Attendee data will be available after the webinar ends.
          </AlertDescription>
        </Alert>
      )}

      {isCompleted && attendees.length === 0 && participantType === 'attendees' && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No attendee data is available for this completed webinar yet. This could be because:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>The webinar just ended and Zoom is still processing the data</li>
              <li>No one attended the webinar</li>
              <li>There was an issue accessing the attendee data from Zoom</li>
            </ul>
            Try refreshing the data or check back in a few minutes.
          </AlertDescription>
        </Alert>
      )}

      {registrants.length > 0 && participantType === 'registrants' && (
        <Alert className="mb-4">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Showing {registrants.length} registered participants for this webinar.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <Tabs 
          value={participantType} 
          onValueChange={setParticipantType}
          className="w-full max-w-xs"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="registrants">
              Registrants ({registrants.length})
            </TabsTrigger>
            <TabsTrigger value="attendees">
              Attendees ({attendees.length})
              {!isCompleted && <Clock className="h-3 w-3 ml-1" />}
              {isCompleted && attendees.length === 0 && <AlertCircle className="h-3 w-3 ml-1" />}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search participants..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              {participantType === 'registrants' ? (
                <>
                  <TableHead>Registration Time</TableHead>
                  <TableHead>Status</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Join Time</TableHead>
                  <TableHead>Duration</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedParticipants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {participantType === 'attendees' && !isCompleted ? (
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="h-8 w-8" />
                      <div>Attendee data will be available after the webinar ends</div>
                    </div>
                  ) : participantType === 'attendees' && isCompleted ? (
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8" />
                      <div>No attendee data available</div>
                      <div className="text-sm">Data may still be processing or no one attended</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8" />
                      <div>No participants found</div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedParticipants.map((participant, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {participantType === 'registrants' 
                      ? `${(participant as Registrant).first_name || ''} ${(participant as Registrant).last_name || ''}`
                      : (participant as Attendee).name || 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    {participantType === 'registrants' 
                      ? (participant as Registrant).email || 'N/A'
                      : (participant as Attendee).user_email || 'N/A'
                    }
                  </TableCell>
                  {participantType === 'registrants' ? (
                    <>
                      <TableCell>
                        {(participant as Registrant).create_time || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {(participant as Registrant).status || 'N/A'}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        {(participant as Attendee).join_time || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {(participant as Attendee).duration 
                          ? `${Math.floor((participant as Attendee).duration / 60)} min` 
                          : 'N/A'
                        }
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination Info and Controls */}
      {totalParticipants > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex}-{endIndex} of {totalParticipants} participants
          </div>
          
          {!isShowingAll && totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (validCurrentPage > 1) setCurrentPage(validCurrentPage - 1);
                    }}
                    className={validCurrentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {getPageNumbers(validCurrentPage, totalPages).map(page => (
                  <PaginationItem key={page}>
                    <PaginationLink 
                      href="#" 
                      isActive={validCurrentPage === page}
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
                      if (validCurrentPage < totalPages) setCurrentPage(validCurrentPage + 1);
                    }}
                    className={validCurrentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
};
