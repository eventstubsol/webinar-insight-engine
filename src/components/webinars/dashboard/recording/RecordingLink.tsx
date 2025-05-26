
import React from 'react';
import { ExternalLink, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { RecordingStatusType } from './recordingStatusUtils';

interface RecordingLinkProps {
  recordingStatus: RecordingStatusType;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const RecordingLink: React.FC<RecordingLinkProps> = ({
  recordingStatus,
  isRefreshing,
  onRefresh
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

  if (typeof recordingStatus === 'string') {
    switch (recordingStatus) {
      case 'loading':
        return (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Loading recordings...</span>
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        );
      case 'processing':
        return (
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">Recording processing...</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        );
      case 'not_completed':
        return <span className="text-muted-foreground">Webinar not completed yet</span>;
      case 'not_available':
        return (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">No recording available</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        );
      default:
        return <span className="text-muted-foreground">Recording not found</span>;
    }
  }

  const recording = recordingStatus as any;
  const recordingUrl = recording.download_url || recording.play_url;
  
  if (!recordingUrl) {
    return <span className="text-muted-foreground">Recording URL not available</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <a 
        href={recordingUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
      >
        View Recording <ExternalLink className="h-3 w-3" />
      </a>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => copyToClipboard(recordingUrl, 'Recording URL')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy recording URL</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="h-6 w-6 p-0"
      >
        <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
};
