
import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WebinarRecording } from '@/hooks/zoom/useZoomWebinarRecordings';
import { Button } from '@/components/ui/button';
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Download, ExternalLink, File, Video } from 'lucide-react';
import { formatDuration } from '@/utils/formatUtils';
import { format, parseISO } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RecordingsPanelProps {
  recordings: WebinarRecording[];
  isLoading: boolean;
}

export function RecordingsPanel({ recordings, isLoading }: RecordingsPanelProps) {
  // Helper to format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Get file icon based on type
  const getFileIcon = (type?: string) => {
    if (!type) return <File className="h-5 w-5" />;
    if (type.includes('video') || type.includes('mp4')) {
      return <Video className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="border rounded-md p-4 h-24 bg-muted/20" />
        ))}
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No recordings found for this webinar.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recordings</CardTitle>
        <CardDescription>
          Access and download webinar recordings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recordings.map((recording) => (
            <div key={recording.id} className="border rounded-md p-4">
              <div className="flex items-center gap-3">
                {getFileIcon(recording.file_type)}
                <div className="flex-1">
                  <h4 className="font-medium">
                    {recording.recording_type
                      ? recording.recording_type.charAt(0).toUpperCase() +
                        recording.recording_type.slice(1)
                      : 'Recording'}
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(recording.recording_start)}
                    {recording.duration && (
                      <span> • {formatDuration(recording.duration)}</span>
                    )}
                    {recording.file_size && (
                      <span> • {Math.round(recording.file_size / 1024 / 1024)} MB</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {recording.play_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(recording.play_url!, '_blank')}
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Play
                    </Button>
                  )}
                  {recording.download_url && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => window.open(recording.download_url!, '_blank')}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
