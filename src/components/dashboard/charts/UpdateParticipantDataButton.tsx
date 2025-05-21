
import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <Button
      variant="outline"
      size="sm"
      onClick={onUpdate}
      disabled={isUpdating || isDisabled}
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
  );
};

export default UpdateParticipantDataButton;
