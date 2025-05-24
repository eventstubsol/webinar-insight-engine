
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { ZoomWebinar } from '@/hooks/zoom';

interface AttendeeDataAlertProps {
  webinars: ZoomWebinar[];
  onUpdateData: () => void;
  isUpdating: boolean;
}

export const AttendeeDataAlert: React.FC<AttendeeDataAlertProps> = ({
  webinars,
  onUpdateData,
  isUpdating
}) => {
  // Simple check for completed webinars
  const completedWebinars = webinars.filter(w => 
    w.status === 'finished' || 
    (w.start_time && new Date(w.start_time) < new Date())
  );
  
  // Don't show alert if we have completed webinars or if we're loading
  if (completedWebinars.length > 0 || isUpdating) {
    return null;
  }

  return (
    <Alert className="bg-blue-50 border-blue-200 mb-4">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <div className="space-y-2">
          <p className="font-medium">No completed webinars found</p>
          <p className="text-sm">
            Attendee data is only available for webinars that have ended. 
            Your webinars may still be scheduled or recently completed.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
};
