
import React from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { RecordingStatusType } from './recordingStatusUtils';

interface RecordingPasswordProps {
  recordingStatus: RecordingStatusType;
}

export const RecordingPassword: React.FC<RecordingPasswordProps> = ({
  recordingStatus
}) => {
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  if (typeof recordingStatus === 'string' || !recordingStatus) {
    return <span className="text-muted-foreground">Not available</span>;
  }

  const recording = recordingStatus as any;
  const password = recording.password;
  
  if (!password) {
    return <span className="text-muted-foreground">No password required</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{password}</code>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => copyToClipboard(password, 'Recording password')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy password</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
