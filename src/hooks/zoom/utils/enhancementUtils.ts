
export type EnhancementType = 'participants' | 'host' | 'panelists' | 'settings' | 'recordings';

export type EnhancementStatus = 'loaded' | 'loading' | 'missing' | 'stale';

export interface EnhancementState {
  participants: EnhancementStatus;
  host: EnhancementStatus;
  panelists: EnhancementStatus;
  settings: EnhancementStatus;
  recordings: EnhancementStatus;
}

const STALE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function getEnhancementState(webinar: any): EnhancementState {
  const rawData = webinar.raw_data || {};
  const now = new Date().getTime();
  
  return {
    participants: getDataStatus(rawData, 'participants_enhanced_at', rawData.registrants || rawData.attendees, now),
    host: getDataStatus(rawData, 'host_enhanced_at', rawData.host_info, now),
    panelists: getDataStatus(rawData, 'panelists_enhanced_at', rawData.panelists, now),
    settings: getDataStatus(rawData, 'settings_enhanced_at', rawData.detailed_settings, now),
    recordings: getDataStatus(rawData, 'recordings_enhanced_at', rawData.recordings, now)
  };
}

function getDataStatus(rawData: any, timestampKey: string, dataKey: any, now: number): EnhancementStatus {
  const enhancedAt = rawData[timestampKey];
  
  // If no enhancement timestamp, check if we have any data
  if (!enhancedAt) {
    return dataKey ? 'loaded' : 'missing';
  }
  
  // Check if data is stale
  const enhancedTime = new Date(enhancedAt).getTime();
  const isStale = now - enhancedTime > STALE_THRESHOLD;
  
  return isStale ? 'stale' : 'loaded';
}

export function canEnhance(webinar: any, type: EnhancementType): boolean {
  const state = getEnhancementState(webinar);
  const status = state[type];
  
  // Can enhance if missing or stale
  return status === 'missing' || status === 'stale';
}

export function isWebinarCompleted(webinar: any): boolean {
  if (webinar.status === 'ended') return true;
  
  if (webinar.start_time && webinar.duration) {
    const startTime = new Date(webinar.start_time).getTime();
    const duration = webinar.duration * 60 * 1000; // duration in ms
    const endTime = startTime + duration;
    return new Date().getTime() > endTime;
  }
  
  return false;
}

export function getEnhancementDescription(type: EnhancementType): string {
  switch (type) {
    case 'participants':
      return 'Load registration and attendance data';
    case 'host':
      return 'Load detailed host information';
    case 'panelists':
      return 'Load panelist information';
    case 'settings':
      return 'Load detailed webinar settings';
    case 'recordings':
      return 'Load recording information';
    default:
      return 'Load additional data';
  }
}

export function getEnhancementLabel(type: EnhancementType): string {
  switch (type) {
    case 'participants':
      return 'Participants';
    case 'host':
      return 'Host Details';
    case 'panelists':
      return 'Panelists';
    case 'settings':
      return 'Settings';
    case 'recordings':
      return 'Recordings';
    default:
      return 'Data';
  }
}
