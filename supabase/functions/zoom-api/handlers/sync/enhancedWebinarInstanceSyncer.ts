
import { logInstanceSyncDebug, verifyInstancesInDatabase } from './debugInstanceSync.ts';
import { createInstancesFromWebinarBatch } from './fixedInstanceCreator.ts';

/**
 * Enhanced webinar instance syncer with comprehensive debugging and fallback creation
 */
export async function syncEnhancedWebinarInstancesForWebinars(
  webinars: any[], 
  token: string, 
  supabase: any, 
  userId: string
) {
  logInstanceSyncDebug(`🔄 Starting ENHANCED instance sync for ${webinars.length} webinars`);
  
  // First, check current state of instances table
  const initialState = await verifyInstancesInDatabase(supabase, userId);
  logInstanceSyncDebug(`Initial instances in database: ${initialState.count}`);
  
  if (!webinars || webinars.length === 0) {
    logInstanceSyncDebug('No webinars to sync instances for');
    return {
      totalInstancesSynced: 0,
      webinarsWithInstancessynced: 0,
      instanceSyncErrors: 0,
      fieldsPopulated: 0,
      actualDataFetched: 0,
      apiCallsSuccessful: 0,
      apiCallsFailed: 0
    };
  }
  
  // Use the fixed instance creator as primary method
  logInstanceSyncDebug('Using fixed instance creator for reliable instance creation');
  
  const creationResult = await createInstancesFromWebinarBatch(webinars, userId, supabase);
  
  // Verify instances were actually created
  const finalState = await verifyInstancesInDatabase(supabase, userId);
  const actualInstancesCreated = finalState.count - initialState.count;
  
  logInstanceSyncDebug(`Instance creation results`, {
    expectedToCreate: webinars.length,
    reportedCreated: creationResult.totalCreated,
    actuallyInDatabase: finalState.count,
    actuallyCreated: actualInstancesCreated,
    errors: creationResult.errors
  });
  
  // Log any discrepancies
  if (actualInstancesCreated !== creationResult.totalCreated) {
    logInstanceSyncDebug('⚠️ DISCREPANCY DETECTED', {
      reportedCreated: creationResult.totalCreated,
      actuallyCreated: actualInstancesCreated,
      message: 'Some instances may have failed to persist to database'
    });
  }
  
  // If no instances were created, log detailed error information
  if (actualInstancesCreated === 0 && webinars.length > 0) {
    logInstanceSyncDebug('🚨 CRITICAL ERROR: No instances created despite having webinars', {
      webinarCount: webinars.length,
      sampleWebinar: webinars[0],
      errors: creationResult.errors,
      userId
    });
  }
  
  logInstanceSyncDebug(`🎉 ENHANCED SYNC COMPLETE`, {
    totalInstancesSynced: actualInstancesCreated,
    webinarsWithInstancessynced: actualInstancesCreated,
    instanceSyncErrors: creationResult.errors.length,
    fieldsPopulated: actualInstancesCreated,
    actualDataFetched: actualInstancesCreated,
    apiCallsSuccessful: actualInstancesCreated,
    apiCallsFailed: creationResult.errors.length
  });
  
  return {
    totalInstancesSynced: actualInstancesCreated,
    webinarsWithInstancessynced: actualInstancesCreated > 0 ? 1 : 0,
    instanceSyncErrors: creationResult.errors.length,
    fieldsPopulated: actualInstancesCreated,
    actualDataFetched: actualInstancesCreated,
    apiCallsSuccessful: actualInstancesCreated,
    apiCallsFailed: creationResult.errors.length
  };
}
