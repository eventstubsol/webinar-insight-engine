
import { WebinarFieldMapping } from '../../utils/enhancedFieldMapper.ts';

export interface SyncSummary {
  totalCollected: number;
  uniqueWebinars: number;
  successfulUpserts: number;
  errors: number;
  webinarsBySource: {
    regular: number;
    reporting: number;
    account: number;
  };
  historicalWebinars: number;
  upcomingWebinars: number;
  webinarsWithProperTopics: number;
  instanceSync: {
    totalInstancesSynced: number;
    webinarsWithInstancessynced: number;
    instanceSyncErrors: number;
  };
}

export function generateSyncSummary(
  allWebinars: WebinarFieldMapping[],
  uniqueWebinars: WebinarFieldMapping[],
  successCount: number,
  errorCount: number,
  instanceSyncResults?: {
    totalInstancesSynced: number;
    webinarsWithInstancessynced: number;
    instanceSyncErrors: number;
  }
): SyncSummary {
  const summary: SyncSummary = {
    totalCollected: allWebinars.length,
    uniqueWebinars: uniqueWebinars.length,
    successfulUpserts: successCount,
    errors: errorCount,
    webinarsBySource: {
      regular: allWebinars.filter(w => w.data_source === 'regular').length,
      reporting: allWebinars.filter(w => w.data_source === 'reporting').length,
      account: allWebinars.filter(w => w.data_source === 'account').length
    },
    historicalWebinars: uniqueWebinars.filter(w => w.is_historical).length,
    upcomingWebinars: uniqueWebinars.filter(w => !w.is_historical).length,
    webinarsWithProperTopics: uniqueWebinars.filter(w => w.topic !== 'Untitled Webinar').length,
    instanceSync: instanceSyncResults || {
      totalInstancesSynced: 0,
      webinarsWithInstancessynced: 0,
      instanceSyncErrors: 0
    }
  };
  
  console.log('📊 ENHANCED SYNC SUMMARY:', summary);
  return summary;
}
