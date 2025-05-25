
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getParticipants } from './getParticipants.ts';

interface WebinarSyncStatus {
  webinarId: string;
  registrantsExpected: number;
  participantsExpected: number;
  registrantsStored: number;
  participantsStored: number;
  isComplete: boolean;
  needsSync: boolean;
}

export async function updateParticipantData(
  supabase: any,
  accessToken: string,
  userId: string,
  targetWebinarId?: string
): Promise<{ success: boolean; message: string; synced: number; errors: string[] }> {
  console.log(`[updateParticipantData] Starting participant data update for user: ${userId}`);
  
  try {
    // Fetch webinars that need participant data sync
    const webinarsQuery = supabase
      .from('zoom_webinars')
      .select('webinar_id, topic, status, raw_data')
      .eq('user_id', userId);
    
    if (targetWebinarId) {
      webinarsQuery.eq('webinar_id', targetWebinarId);
    } else {
      // Only sync completed webinars
      webinarsQuery.in('status', ['ended', 'completed']);
    }
    
    const { data: webinars, error: webinarsError } = await webinarsQuery;
    
    if (webinarsError) {
      throw new Error(`Failed to fetch webinars: ${webinarsError.message}`);
    }
    
    if (!webinars || webinars.length === 0) {
      return { 
        success: true, 
        message: 'No webinars found for participant sync', 
        synced: 0, 
        errors: [] 
      };
    }

    console.log(`[updateParticipantData] Found ${webinars.length} webinars to analyze`);

    // Analyze which webinars need complete sync
    const syncStatuses = await analyzeWebinarSyncStatus(supabase, webinars, userId);
    const webinarsNeedingSync = syncStatuses.filter(status => status.needsSync);
    
    console.log(`[updateParticipantData] ${webinarsNeedingSync.length} webinars need participant sync`);
    
    if (webinarsNeedingSync.length === 0) {
      return { 
        success: true, 
        message: 'All webinars have complete participant data', 
        synced: 0, 
        errors: [] 
      };
    }

    let syncedCount = 0;
    const errors: string[] = [];
    const maxConcurrent = 3; // Limit concurrent syncs to avoid API rate limits
    
    // Process webinars in batches to avoid overwhelming the API
    for (let i = 0; i < webinarsNeedingSync.length; i += maxConcurrent) {
      const batch = webinarsNeedingSync.slice(i, i + maxConcurrent);
      
      console.log(`[updateParticipantData] Processing batch ${Math.floor(i / maxConcurrent) + 1} (${batch.length} webinars)`);
      
      const batchPromises = batch.map(async (syncStatus) => {
        try {
          console.log(`[updateParticipantData] Syncing webinar ${syncStatus.webinarId} - Expected: R${syncStatus.registrantsExpected} P${syncStatus.participantsExpected}, Stored: R${syncStatus.registrantsStored} P${syncStatus.participantsStored}`);
          
          // Delete existing incomplete data for this webinar
          await supabase
            .from('zoom_webinar_participants')
            .delete()
            .eq('user_id', userId)
            .eq('webinar_id', syncStatus.webinarId);
          
          // Fetch complete participant data with pagination
          const result = await getParticipants(
            supabase,
            accessToken,
            syncStatus.webinarId,
            userId
          );
          
          console.log(`[updateParticipantData] Successfully synced webinar ${syncStatus.webinarId}: ${result.registrants.length} registrants, ${result.attendees.length} attendees`);
          
          // Update webinar metadata with latest participant counts
          await supabase
            .from('zoom_webinars')
            .update({
              last_synced_at: new Date().toISOString(),
              raw_data: {
                ...webinars.find(w => w.webinar_id === syncStatus.webinarId)?.raw_data,
                actual_registrants_count: result.registrants.length,
                actual_participants_count: result.attendees.length,
                sync_completed_at: new Date().toISOString()
              }
            })
            .eq('user_id', userId)
            .eq('webinar_id', syncStatus.webinarId);
          
          return { success: true, webinarId: syncStatus.webinarId };
          
        } catch (error) {
          const errorMsg = `Failed to sync webinar ${syncStatus.webinarId}: ${error.message}`;
          console.error(`[updateParticipantData] ${errorMsg}`);
          errors.push(errorMsg);
          return { success: false, webinarId: syncStatus.webinarId, error: errorMsg };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Count successful syncs and collect errors
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          syncedCount++;
        }
      });
      
      // Rate limiting delay between batches
      if (i + maxConcurrent < webinarsNeedingSync.length) {
        console.log(`[updateParticipantData] Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const message = `Participant sync completed: ${syncedCount}/${webinarsNeedingSync.length} webinars updated successfully`;
    console.log(`[updateParticipantData] ${message}`);
    
    return {
      success: errors.length === 0,
      message,
      synced: syncedCount,
      errors
    };
    
  } catch (error) {
    console.error('[updateParticipantData] Critical error:', error);
    return {
      success: false,
      message: `Failed to update participant data: ${error.message}`,
      synced: 0,
      errors: [error.message]
    };
  }
}

async function analyzeWebinarSyncStatus(
  supabase: any,
  webinars: any[],
  userId: string
): Promise<WebinarSyncStatus[]> {
  const statuses: WebinarSyncStatus[] = [];
  
  for (const webinar of webinars) {
    try {
      // Get expected counts from webinar metadata
      const rawData = webinar.raw_data || {};
      const registrantsExpected = rawData.num_of_registrants || rawData.registrants_count || 0;
      const participantsExpected = rawData.participants_count || rawData.num_of_participants || 0;
      
      // Get actual stored counts
      const { data: storedParticipants } = await supabase
        .from('zoom_webinar_participants')
        .select('participant_type')
        .eq('user_id', userId)
        .eq('webinar_id', webinar.webinar_id);
      
      const registrantsStored = storedParticipants?.filter(p => p.participant_type === 'registrant').length || 0;
      const participantsStored = storedParticipants?.filter(p => p.participant_type === 'attendee').length || 0;
      
      // Determine if sync is needed
      const registrantsComplete = registrantsExpected === 0 || registrantsStored >= registrantsExpected;
      const participantsComplete = participantsExpected === 0 || participantsStored >= participantsExpected;
      const isComplete = registrantsComplete && participantsComplete;
      
      // Need sync if we have expected data but incomplete storage, or if we have 0 stored but expected > 0
      const needsSync = !isComplete || 
        (registrantsExpected > 0 && registrantsStored === 0) ||
        (participantsExpected > 0 && participantsStored === 0) ||
        (registrantsStored > 0 && registrantsStored < registrantsExpected * 0.9) || // Less than 90% of expected
        (participantsStored > 0 && participantsStored < participantsExpected * 0.9);
      
      statuses.push({
        webinarId: webinar.webinar_id,
        registrantsExpected,
        participantsExpected,
        registrantsStored,
        participantsStored,
        isComplete,
        needsSync
      });
      
    } catch (error) {
      console.error(`[analyzeWebinarSyncStatus] Error analyzing webinar ${webinar.webinar_id}:`, error);
      // Mark as needing sync if we can't determine status
      statuses.push({
        webinarId: webinar.webinar_id,
        registrantsExpected: 0,
        participantsExpected: 0,
        registrantsStored: 0,
        participantsStored: 0,
        isComplete: false,
        needsSync: true
      });
    }
  }
  
  return statuses;
}
