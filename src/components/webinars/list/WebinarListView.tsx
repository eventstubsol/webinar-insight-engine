
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WebinarStatusBadge } from './WebinarStatusBadge';
import { WebinarLoading } from './WebinarLoading';
import { WebinarEmptyState } from './WebinarEmptyState';
import { WebinarError } from './WebinarError';
import { ZoomWebinar } from '@/hooks/zoom';
import { format } from 'date-fns';

interface WebinarListViewProps {
  webinars: ZoomWebinar[];
  isLoading: boolean;
  error: Error | null;
  errorDetails: any;
  onDismissError: () => void;
  errorBannerDismissed: boolean;
}

export const WebinarListView: React.FC<WebinarListViewProps> = ({
  webinars,
  isLoading,
  error,
  errorDetails,
  onDismissError,
  errorBannerDismissed
}) => {
  if (isLoading) {
    return <WebinarLoading />;
  }

  if (error && !errorBannerDismissed) {
    return (
      <WebinarError 
        error={error}
        errorDetails={errorDetails}
        onDismiss={onDismissError}
      />
    );
  }

  if (!webinars || webinars.length === 0) {
    return <WebinarEmptyState />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Topic</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Participants</TableHead>
            <TableHead>Registrants</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {webinars.map((webinar) => (
            <TableRow key={webinar.webinar_id} className="cursor-pointer hover:bg-muted/50">
              <TableCell className="font-medium">
                {webinar.topic}
              </TableCell>
              <TableCell>
                {webinar.start_time ? format(new Date(webinar.start_time), 'MMM d, yyyy h:mm a') : 'TBD'}
              </TableCell>
              <TableCell>
                {webinar.duration ? `${webinar.duration} min` : 'TBD'}
              </TableCell>
              <TableCell>
                <WebinarStatusBadge status={webinar.status} />
              </TableCell>
              <TableCell>
                {webinar.participants_count || 0}
              </TableCell>
              <TableCell>
                {webinar.registrants_count || 0}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
