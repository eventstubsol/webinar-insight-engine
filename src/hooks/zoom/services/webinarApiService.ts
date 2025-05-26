
// Re-export the new centralized API client
export { zoomApiClient as default } from './zoomApiClient';

// Maintain backward compatibility
export {
  zoomDatabaseService as fetchWebinarsFromDatabase,
  zoomDatabaseService as fetchWebinarInstancesFromDatabase
} from './zoomDatabaseService';

export {
  zoomApiClient as fetchWebinarsFromAPI,
  zoomApiClient as refreshWebinarsFromAPI,
  zoomApiClient as updateParticipantDataAPI,
  zoomApiClient as syncTimingDataAPI,
  zoomApiClient as fetchWebinarInstancesAPI,
  zoomApiClient as fetchInstanceParticipantsAPI,
  zoomApiClient as fetchWebinarRecordingsAPI
} from './zoomApiClient';

export {
  zoomDatabaseService as fetchSyncHistory
} from './zoomDatabaseService';
