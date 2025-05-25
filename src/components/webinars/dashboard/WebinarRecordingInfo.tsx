
import React from 'react';
import { ZoomWebinar } from '@/hooks/zoom';
import { ZoomRecording } from '@/hooks/zoom/useZoomWebinarRecordings';
import { Video, Key, Copy, ExternalLink, Clock, FileVideo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WebinarRecordingInfoProps {
  webinar: ZoomWebinar;
  recordings: ZoomRecording[];
  isLoadingRecordings: boolean;
}

export const WebinarRecordingInfo: React.FC<WebinarRecordingInfoProps> = ({ 
  webinar, 
  recordings, 
  isLoadingRecordings 
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

  const getRecordingStatus = () => {
    if (isLoadingRecordings) return 'Loading...';
    
    if (recordings.length > 0) {
      const activeRecording = recordings.find(r => r.status === 'completed') || recordings[0];
      return activeRecording;
    }
    
    // Check webinar raw_data for recording info
    const rawData = webinar.raw_data;
    if (rawData?.recording_url) {
      return {
        download_url: rawData.recording_url,
        password: rawData.recording_password,
        status: 'completed'
      };
    }
    
    // Determine status based on webinar timing
    const now = new Date();
    const webinarStart = webinar.start_time ? new Date(webinar.start_time) : null;
    const webinarEnd = webinarStart ? new Date(webinarStart.getTime() + (webinar.duration * 60000)) : null;
    
    if (webinarEnd && now > webinarEnd && now.getTime() - webinarEnd.getTime() < 30 * 60 * 1000) {
      return 'processing';
    }
    
    return 'not_available';
  };

  const recordingStatus = getRecordingStatus();

  const renderRecordingLink = () => {
    if (typeof recordingStatus === 'string') {
      switch (recordingStatus) {
        case 'Loading...':
          return <span className="text-muted-foreground">Loading recordings...</span>;
        case 'processing':
          return <span className="text-yellow-600">Recording processing...</span>;
        case 'not_available':
          return <span className="text-muted-foreground">No recording available</span>;
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
      </div>
    );
  };

  const renderRecordingPassword = () => {
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

  return (
    <>
      <Video className="h-4 w-4 text-muted-foreground mt-1" />
      <div>
        <span className="font-medium">Recording Link:</span> {renderRecordingLink()}
      </div>
      
      <Key className="h-4 w-4 text-muted-foreground mt-1" />
      <div>
        <span className="font-medium">Recording Password:</span> {renderRecordingPassword()}
      </div>
    </>
  );
};
