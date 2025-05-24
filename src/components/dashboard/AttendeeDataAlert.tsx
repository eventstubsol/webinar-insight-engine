
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle } from 'lucide-react';
import { ZoomWebinar } from '@/hooks/zoom';
import { getWebinarsWithFetchErrors, getCompletedWebinarsCount, hasAttendeeData } from './utils/statsUtils';

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
  const hasAttendees = hasAttendeeData(webinars);
  const completedWebinarsCount = getCompletedWebinarsCount(webinars);
  const webinarsWithErrors = getWebinarsWithFetchErrors(webinars);
  
  // Don't show alert if we have attendee data
  if (hasAttendees && webinarsWithErrors.length === 0) {
    return null;
  }

  // Show different messages based on the situation
  if (webinarsWithErrors.length > 0) {
    return (
      <Alert className="bg-amber-50 border-amber-200 mb-4">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <div className="space-y-2">
            <p className="font-medium">Some attendee data could not be fetched</p>
            <p className="text-sm">
              {webinarsWithErrors.length} webinar(s) had issues fetching participant data. 
              This may be due to:
            </p>
            <ul className="text-sm list-disc list-inside ml-2 space-y-1">
              <li>Webinars that haven't ended yet</li>
              <li>Missing Zoom app permissions for participant data</li>
              <li>API rate limiting or temporary issues</li>
            </ul>
            <p className="text-sm">
              Try updating the data again, or check your Zoom app permissions include webinar participant access.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (completedWebinarsCount === 0) {
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
  }

  if (!hasAttendees) {
    return (
      <Alert className="bg-blue-50 border-blue-200 mb-4">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="space-y-2">
            <p className="font-medium">Attendee data not yet fetched</p>
            <p className="text-sm">
              You have {completedWebinarsCount} completed webinar(s). Click "Update Participant Data" 
              to fetch attendee information from Zoom.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
