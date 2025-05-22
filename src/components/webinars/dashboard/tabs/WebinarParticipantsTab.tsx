
import React, { useState } from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Download } from 'lucide-react';

interface WebinarParticipantsTabProps {
  webinar: ZoomWebinar;
  participants: ZoomParticipants;
}

export const WebinarParticipantsTab: React.FC<WebinarParticipantsTabProps> = ({
  webinar,
  participants
}) => {
  const [participantType, setParticipantType] = useState('registrants');
  const [searchQuery, setSearchQuery] = useState('');
  
  const displayParticipants = participantType === 'registrants' 
    ? participants.registrants || [] 
    : participants.attendees || [];
    
  const filteredParticipants = displayParticipants.filter(p => 
    searchQuery === '' || 
    (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.first_name && p.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.last_name && p.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
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
      
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <Tabs 
          value={participantType} 
          onValueChange={setParticipantType}
          className="w-full max-w-xs"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="registrants">
              Registrants ({participants.registrants?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="attendees">
              Attendees ({participants.attendees?.length || 0})
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
            {filteredParticipants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  No participants found
                </TableCell>
              </TableRow>
            ) : (
              filteredParticipants.slice(0, 10).map((participant, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {participant.first_name || participant.name || ''} {participant.last_name || ''}
                  </TableCell>
                  <TableCell>{participant.email || 'N/A'}</TableCell>
                  {participantType === 'registrants' ? (
                    <>
                      <TableCell>
                        {participant.create_time || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {participant.status || 'N/A'}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        {participant.join_time || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {participant.duration ? `${Math.floor(participant.duration / 60)} min` : 'N/A'}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {filteredParticipants.length > 10 && (
        <div className="flex justify-center mt-4">
          <p className="text-sm text-muted-foreground">
            Showing 10 of {filteredParticipants.length} participants
          </p>
        </div>
      )}
    </div>
  );
};
