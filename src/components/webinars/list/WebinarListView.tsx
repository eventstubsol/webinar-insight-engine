
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { WebinarStatusBadge } from './WebinarStatusBadge';
import { getWebinarStatus } from './webinarHelpers';
import { ZoomWebinar } from '@/hooks/useZoomApi';
import { format } from 'date-fns';
import { Clock, Download, ChartBar, Eye, Loader2 } from 'lucide-react';

interface WebinarListViewProps {
  webinars: ZoomWebinar[];
  selectedWebinars: string[];
  handleWebinarSelection: (webinarId: string) => void;
  handleSelectAll: () => void;
  isRefetching?: boolean;
}

export const WebinarListView: React.FC<WebinarListViewProps> = ({ 
  webinars,
  selectedWebinars,
  handleWebinarSelection,
  handleSelectAll,
  isRefetching = false
}) => {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30px]">
              <Checkbox 
                checked={selectedWebinars.length === webinars.length && webinars.length > 0}
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
          {webinars.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {isRefetching && <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />}
                {webinars.length === 0 ? 'No webinars found. Connect to Zoom to sync your webinars.' : 'No webinars found matching your search'}
              </TableCell>
            </TableRow>
          ) : (
            webinars.map((webinar) => {
              const status = getWebinarStatus(webinar);
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
                    <div className="flex items-center">
                      {isRefetching && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                      <div>
                        {webinar.topic}
                        <p className="text-muted-foreground text-xs mt-1 line-clamp-1">
                          ID: {webinar.id}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {format(webinarDate, 'MMM d, yyyy • h:mm a')}
                    <p className="text-xs text-muted-foreground">{webinar.timezone}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{webinar.host_email}</TableCell>
                  <TableCell className="hidden lg:table-cell">{webinar.duration} mins</TableCell>
                  <TableCell>
                    <WebinarStatusBadge status={status} />
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

