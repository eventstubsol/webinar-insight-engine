
import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UpdateParticipantDataButtonProps {
  isUpdating: boolean;
  isDisabled: boolean;
  onUpdate: () => void;
}

export const UpdateParticipantDataButton: React.FC<UpdateParticipantDataButtonProps> = ({ 
  isUpdating,
  isDisabled,
  onUpdate
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={onUpdate}
              disabled={isUpdating || isDisabled}
              className="transition-all"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Update Data
                </>
              )}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isDisabled 
            ? "Please connect your Zoom account to update participant data" 
            : (isUpdating 
              ? "Fetching latest participant data from Zoom" 
              : "Refresh webinar attendance data from Zoom"
            )
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default UpdateParticipantDataButton;
