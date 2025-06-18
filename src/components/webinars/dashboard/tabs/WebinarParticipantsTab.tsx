import React, { useState, useMemo, useEffect } from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { useZoomParticipantSync } from '@/hooks/zoom/useZoomParticipantSync';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Search, Download, RefreshCw, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  
  // Registrant sync functionality
  const { syncRegistrantsForWebinar, isLoading: isSyncing } = useZoomParticipantSync();
  
  const registrants = participants.registrants as Registrant[] || [];
  const attendees = participants.attendees as Attendee[] || [];
  
  const displayParticipants = participantType === 'registrants' ? registrants : attendees;
  
  // Check if registrant data might be missing
  const hasRegistrantData = registrants.length > 0;
  const registrantCount = webinar.registrants_count || 0;
  const showSyncButton = !hasRegistrantData && registrantCount === 0;
    
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

  useEffect(() => {
    setCurrentPage(1);
  }, [participantType, searchQuery, itemsPerPage]);

  const totalParticipants = filteredParticipants.length;
  const isShowingAll = itemsPerPage === 'all';
  const itemsPerPageNum = isShowingAll ? totalParticipants : parseInt(itemsPerPage);
  const totalPages = isShowingAll ? 1 : Math.max(1, Math.ceil(totalParticipants / itemsPerPageNum));
  
  const validCurrentPage = useMemo(() => {
    if (currentPage > totalPages) return Math.max(1, totalPages);
    if (currentPage < 1) return 1;
    return currentPage;
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (validCurrentPage !== currentPage) {
      setCurrentPage(validCurrentPage);
    }
  }, [validCurrentPage, currentPage]);

  const paginatedParticipants = useMemo(() => {
    if (isShowingAll) return filteredParticipants;
    
    const startIndex = (validCurrentPage - 1) * itemsPerPageNum;
    return filteredParticipants.slice(startIndex, startIndex + itemsPerPageNum);
  }, [filteredParticipants, validCurrentPage, itemsPerPageNum, isShowingAll]);

  const startIndex = isShowingAll ? 1 : (validCurrentPage - 1) * itemsPerPageNum + 1;
  const endIndex = isShowingAll ? totalParticipants : Math.min(validCurrentPage * itemsPerPageNum, totalParticipants);
  
  // Handle registrant sync
  const handleSyncRegistrants = async () => {
    try {
      await syncRegistrantsForWebinar(webinar.id);
      // Refresh the page to show new data
      window.location.reload();
    } catch (error) {
      console.error('Failed to sync registrants:', error);
    }
  };
  
  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">Webinar Participants</h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Sync registrants button */}
          {showSyncButton && (
            <Button 
              variant="outline" 
              className="gap-1"
              onClick={handleSyncRegistrants}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              <span>{isSyncing ? 'Syncing...' : 'Sync Registrants'}</span>
            </Button>
          )}
          
          <Button variant="outline" className="gap-1">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>
      
      {/* Show sync alert if no registrant data */}
      {showSyncButton && participantType === 'registrants' && (
        <Alert className="mb-4">
          <Users className="h-4 w-4" />
          <AlertDescription>
            No registrant data found for this webinar. Click "Sync Registrants" to fetch registrant information from Zoom.
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
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  No participants found
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
