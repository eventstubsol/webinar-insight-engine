
import { toast } from '@/hooks/use-toast';

// Re-export all functions for backward compatibility
export {
  fetchWebinarsFromDatabase,
  fetchWebinarInstancesFromDatabase
} from './databaseQueries';

export {
  fetchWebinarsFromAPI,
  refreshWebinarsFromAPI,
  updateParticipantDataAPI,
  fetchWebinarInstancesAPI,
  fetchInstanceParticipantsAPI,
  fetchWebinarRecordingsAPI
} from './apiOperations';

export {
  fetchSyncHistory
} from './syncHistoryService';
