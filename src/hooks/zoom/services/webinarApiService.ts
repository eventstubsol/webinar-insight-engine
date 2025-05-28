
import { toast } from '@/hooks/use-toast';

// Re-export all functions for backward compatibility
export {
  fetchWebinarsFromDatabase,
  fetchWebinarInstancesFromDatabase
} from './databaseQueries';

export {
  fetchWebinarsFromAPI,
  fetchWebinarsFromAPILegacy,
  refreshWebinarsFromAPI
} from './coreWebinarOperations';

export {
  updateParticipantDataAPI,
  fetchWebinarInstancesAPI,
  fetchInstanceParticipantsAPI
} from './participantOperations';

export {
  fetchWebinarRecordingsAPI
} from './recordingOperations';

export {
  debugAPIResponses
} from './debugOperations';

export {
  fetchSyncHistory
} from './syncHistoryService';
