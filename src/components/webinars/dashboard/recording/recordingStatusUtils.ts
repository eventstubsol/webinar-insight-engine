
import { ZoomWebinar } from '@/hooks/zoom';
import { ZoomRecording } from '@/hooks/zoom/useZoomWebinarRecordings';

export type RecordingStatusType = 'loading' | 'processing' | 'not_completed' | 'not_available' | ZoomRecording;

export const getRecordingStatus = (
  webinar: ZoomWebinar,
  recordings: ZoomRecording[],
  isLoadingRecordings: boolean,
  isRefreshing: boolean
): RecordingStatusType => {
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
    } as ZoomRecording;
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
