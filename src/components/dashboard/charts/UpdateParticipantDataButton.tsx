
import React from 'react';
import { Loader2, Zap } from 'lucide-react';
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
                  Phase 2 Running...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-3 w-3" />
                  Phase 2 Enhancement
                </>
              )}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isDisabled 
            ? "Please connect your Zoom account to run Phase 2 enhancement" 
            : (isUpdating 
              ? "Running Phase 2: Updating participant data and timing information from Zoom" 
              : "Phase 2: Update participant data AND enhance with actual timing data"
            )
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default UpdateParticipantDataButton;
