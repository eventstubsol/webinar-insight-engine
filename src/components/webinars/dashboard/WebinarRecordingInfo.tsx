
import React, { useState } from 'react';
import { ZoomWebinar } from '@/hooks/zoom';
import { ZoomRecording, useZoomWebinarRecordings } from '@/hooks/zoom/useZoomWebinarRecordings';
import { Video, Key, Copy, ExternalLink, Clock, FileVideo, RefreshCw } from 'lucide-react';
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
  const { refreshRecordings } = useZoomWebinarRecordings(webinar.id);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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

  const handleRefreshRecordings = async () => {
    setIsRefreshing(true);
    try {
      await refreshRecordings();
      toast({
        title: 'Recordings refreshed',
        description: 'Recording data has been updated from Zoom',
      });
    } catch (error) {
      toast({
        title: 'Refresh failed',
        description: 'Could not refresh recording data',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getRecordingStatus = () => {
    if (isLoadingRecordings || isRefreshing) return 'loading';
    
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
    
    // Check if webinar is completed
    const isCompleted = webinar.status === 'ended' || webinar.status === 'aborted';
    if (!isCompleted) {
      return 'not_completed';
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
                onClick={handleRefreshRecordings}
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
                onClick={handleRefreshRecordings}
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
          onClick={handleRefreshRecordings}
          disabled={isRefreshing}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
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
