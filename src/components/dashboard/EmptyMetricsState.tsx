
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Info, RefreshCw } from 'lucide-react';

interface EmptyMetricsStateProps {
  onUpdateParticipantData: () => void;
  isUpdating: boolean;
}

export const EmptyMetricsState: React.FC<EmptyMetricsStateProps> = ({
  onUpdateParticipantData,
  isUpdating
}) => {
  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="space-y-3">
            <p className="font-medium">Registration and attendance data not available</p>
            <p className="text-sm">
              To see registration and attendance metrics, you need to update participant data from Zoom.
              This will fetch the latest registration and attendance counts for your webinars.
            </p>
            <Button 
              onClick={onUpdateParticipantData}
              disabled={isUpdating}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating Data...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Update Participant Data
                </>
              )}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
