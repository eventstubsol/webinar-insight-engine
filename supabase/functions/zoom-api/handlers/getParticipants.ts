
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PaginatedResponse {
  registrants?: any[];
  participants?: any[];
  page_count?: number;
  page_number?: number;
  page_size?: number;
  total_records?: number;
  next_page_token?: string;
}

interface SyncProgress {
  webinarId: string;
  totalExpected: number;
  totalRetrieved: number;
  pagesProcessed: number;
  registrantPages: number;
  participantPages: number;
  errors: string[];
}

export async function getParticipants(
  supabase: any,
  accessToken: string,
  webinarId: string,
  userId: string
): Promise<{ attendees: any[], registrants: any[] }> {
  console.log(`[getParticipants] Starting complete participant sync for webinar: ${webinarId}`);
  
  const syncProgress: SyncProgress = {
    webinarId,
    totalExpected: 0,
    totalRetrieved: 0,
    pagesProcessed: 0,
    registrantPages: 0,
    participantPages: 0,
    errors: []
  };

  const allAttendees: any[] = [];
  const allRegistrants: any[] = [];

  try {
    // Create sync history entry
    const { data: syncRecord } = await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: userId,
        sync_type: 'participants',
        status: 'in_progress',
        message: `Starting participant sync for webinar ${webinarId}`,
        sync_details: { webinar_id: webinarId, stage: 'starting' }
      })
      .select()
      .single();

    // Fetch all registrants with pagination
    await fetchAllRegistrants(accessToken, webinarId, allRegistrants, syncProgress);
    
    // Fetch all attendees with pagination
    await fetchAllAttendees(accessToken, webinarId, allAttendees, syncProgress);

    // Batch insert registrants
    if (allRegistrants.length > 0) {
      await batchInsertParticipants(supabase, allRegistrants, 'registrant', webinarId, userId);
    }

    // Batch insert attendees
    if (allAttendees.length > 0) {
      await batchInsertParticipants(supabase, allAttendees, 'attendee', webinarId, userId);
    }

    syncProgress.totalRetrieved = allRegistrants.length + allAttendees.length;

    // Update sync history with success
    if (syncRecord) {
      await supabase
        .from('zoom_sync_history')
        .update({
          status: 'completed',
          message: `Successfully synced ${syncProgress.totalRetrieved} participants`,
          items_synced: syncProgress.totalRetrieved,
          total_expected: syncProgress.totalExpected,
          total_retrieved: syncProgress.totalRetrieved,
          pages_processed: syncProgress.pagesProcessed,
          sync_details: {
            webinar_id: webinarId,
            registrants_count: allRegistrants.length,
            attendees_count: allAttendees.length,
            registrant_pages: syncProgress.registrantPages,
            participant_pages: syncProgress.participantPages,
            stage: 'completed'
          }
        })
        .eq('id', syncRecord.id);
    }

    console.log(`[getParticipants] Sync completed for webinar ${webinarId}: ${allRegistrants.length} registrants, ${allAttendees.length} attendees`);
    
    return { attendees: allAttendees, registrants: allRegistrants };

  } catch (error) {
    console.error(`[getParticipants] Error syncing participants for webinar ${webinarId}:`, error);
    
    syncProgress.errors.push(error.message || 'Unknown error');
    
    // Update sync history with error
    if (syncRecord) {
      await supabase
        .from('zoom_sync_history')
        .update({
          status: 'failed',
          message: `Failed to sync participants: ${error.message}`,
          sync_details: {
            webinar_id: webinarId,
            errors: syncProgress.errors,
            stage: 'failed'
          }
        })
        .eq('id', syncRecord.id);
    }
    
    throw error;
  }
}

async function fetchAllRegistrants(
  accessToken: string,
  webinarId: string,
  allRegistrants: any[],
  syncProgress: SyncProgress
): Promise<void> {
  let nextPageToken: string | undefined;
  let pageNumber = 1;
  
  console.log(`[fetchAllRegistrants] Starting registrant pagination for webinar ${webinarId}`);
  
  do {
    try {
      const url = new URL(`https://api.zoom.us/v2/webinars/${webinarId}/registrants`);
      url.searchParams.set('page_size', '300');
      if (nextPageToken) {
        url.searchParams.set('next_page_token', nextPageToken);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit - wait and retry
          console.log(`[fetchAllRegistrants] Rate limit hit, waiting 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: PaginatedResponse = await response.json();
      
      if (data.registrants && data.registrants.length > 0) {
        allRegistrants.push(...data.registrants);
        console.log(`[fetchAllRegistrants] Page ${pageNumber}: Retrieved ${data.registrants.length} registrants (Total: ${allRegistrants.length})`);
      }

      // Update progress tracking
      syncProgress.registrantPages = pageNumber;
      syncProgress.pagesProcessed++;
      if (data.total_records) {
        syncProgress.totalExpected += data.total_records;
      }

      nextPageToken = data.next_page_token;
      pageNumber++;

      // Small delay to avoid overwhelming the API
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(`[fetchAllRegistrants] Error on page ${pageNumber}:`, error);
      syncProgress.errors.push(`Registrants page ${pageNumber}: ${error.message}`);
      
      // Retry logic for non-fatal errors
      if (pageNumber <= 3) { // Retry only for first few pages
        console.log(`[fetchAllRegistrants] Retrying page ${pageNumber} in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      throw error;
    }
  } while (nextPageToken);
  
  console.log(`[fetchAllRegistrants] Completed registrant pagination: ${allRegistrants.length} total registrants in ${pageNumber - 1} pages`);
}

async function fetchAllAttendees(
  accessToken: string,
  webinarId: string,
  allAttendees: any[],
  syncProgress: SyncProgress
): Promise<void> {
  let nextPageToken: string | undefined;
  let pageNumber = 1;
  
  console.log(`[fetchAllAttendees] Starting attendee pagination for webinar ${webinarId}`);
  
  do {
    try {
      const url = new URL(`https://api.zoom.us/v2/webinars/${webinarId}/participants`);
      url.searchParams.set('page_size', '300');
      if (nextPageToken) {
        url.searchParams.set('next_page_token', nextPageToken);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit - wait and retry
          console.log(`[fetchAllAttendees] Rate limit hit, waiting 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: PaginatedResponse = await response.json();
      
      if (data.participants && data.participants.length > 0) {
        allAttendees.push(...data.participants);
        console.log(`[fetchAllAttendees] Page ${pageNumber}: Retrieved ${data.participants.length} attendees (Total: ${allAttendees.length})`);
      }

      // Update progress tracking
      syncProgress.participantPages = pageNumber;
      syncProgress.pagesProcessed++;
      if (data.total_records) {
        syncProgress.totalExpected += data.total_records;
      }

      nextPageToken = data.next_page_token;
      pageNumber++;

      // Small delay to avoid overwhelming the API
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(`[fetchAllAttendees] Error on page ${pageNumber}:`, error);
      syncProgress.errors.push(`Attendees page ${pageNumber}: ${error.message}`);
      
      // Retry logic for non-fatal errors
      if (pageNumber <= 3) { // Retry only for first few pages
        console.log(`[fetchAllAttendees] Retrying page ${pageNumber} in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      throw error;
    }
  } while (nextPageToken);
  
  console.log(`[fetchAllAttendees] Completed attendee pagination: ${allAttendees.length} total attendees in ${pageNumber - 1} pages`);
}

async function batchInsertParticipants(
  supabase: any,
  participants: any[],
  type: 'registrant' | 'attendee',
  webinarId: string,
  userId: string
): Promise<void> {
  const batchSize = 1000;
  const totalBatches = Math.ceil(participants.length / batchSize);
  
  console.log(`[batchInsertParticipants] Inserting ${participants.length} ${type}s in ${totalBatches} batches`);

  for (let i = 0; i < participants.length; i += batchSize) {
    const batch = participants.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    try {
      const records = batch.map(participant => ({
        user_id: userId,
        webinar_id: webinarId,
        participant_type: type,
        name: participant.name || participant.first_name + ' ' + (participant.last_name || ''),
        email: participant.email,
        participant_id: participant.id || participant.registrant_id,
        join_time: participant.join_time,
        leave_time: participant.leave_time,
        duration: participant.duration,
        raw_data: participant
      }));

      // Use upsert to handle duplicates
      const { error } = await supabase
        .from('zoom_webinar_participants')
        .upsert(records, { 
          onConflict: 'user_id,webinar_id,participant_id,participant_type',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`[batchInsertParticipants] Error in batch ${batchNumber}:`, error);
        throw error;
      }

      console.log(`[batchInsertParticipants] Successfully inserted batch ${batchNumber}/${totalBatches} (${batch.length} ${type}s)`);
      
      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < participants.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

    } catch (error) {
      console.error(`[batchInsertParticipants] Failed to insert batch ${batchNumber}:`, error);
      throw error;
    }
  }
}
