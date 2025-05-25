
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface ParticipantSyncResult {
  webinarId: string;
  totalRegistrants: number;
  totalAttendees: number;
  insertedRegistrants: number;
  insertedAttendees: number;
  errors: string[];
  pagesProcessed: number;
  processingTimeMs: number;
}

export class ParticipantDataProcessor {
  private supabase: any;
  private userId: string;
  private accessToken: string;

  constructor(supabase: any, userId: string, accessToken: string) {
    this.supabase = supabase;
    this.userId = userId;
    this.accessToken = accessToken;
  }

  async processWebinarParticipants(webinarId: string): Promise<ParticipantSyncResult> {
    const startTime = Date.now();
    const result: ParticipantSyncResult = {
      webinarId,
      totalRegistrants: 0,
      totalAttendees: 0,
      insertedRegistrants: 0,
      insertedAttendees: 0,
      errors: [],
      pagesProcessed: 0,
      processingTimeMs: 0
    };

    try {
      console.log(`[ParticipantDataProcessor] Starting processing for webinar ${webinarId}`);

      // Clear existing data to ensure fresh sync
      await this.clearExistingData(webinarId);

      // Process registrants with full pagination
      const registrantsResult = await this.processRegistrants(webinarId);
      result.totalRegistrants = registrantsResult.total;
      result.insertedRegistrants = registrantsResult.inserted;
      result.pagesProcessed += registrantsResult.pages;
      result.errors.push(...registrantsResult.errors);

      // Process attendees with full pagination
      const attendeesResult = await this.processAttendees(webinarId);
      result.totalAttendees = attendeesResult.total;
      result.insertedAttendees = attendeesResult.inserted;
      result.pagesProcessed += attendeesResult.pages;
      result.errors.push(...attendeesResult.errors);

      result.processingTimeMs = Date.now() - startTime;
      
      console.log(`[ParticipantDataProcessor] Completed processing for webinar ${webinarId}: ${result.totalRegistrants} registrants, ${result.totalAttendees} attendees in ${result.processingTimeMs}ms`);

      return result;

    } catch (error) {
      result.errors.push(`Critical error: ${error.message}`);
      result.processingTimeMs = Date.now() - startTime;
      throw error;
    }
  }

  private async clearExistingData(webinarId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('zoom_webinar_participants')
        .delete()
        .eq('user_id', this.userId)
        .eq('webinar_id', webinarId);

      if (error) {
        throw new Error(`Failed to clear existing data: ${error.message}`);
      }

      console.log(`[ParticipantDataProcessor] Cleared existing participant data for webinar ${webinarId}`);
    } catch (error) {
      console.error(`[ParticipantDataProcessor] Error clearing existing data:`, error);
      throw error;
    }
  }

  private async processRegistrants(webinarId: string): Promise<{ total: number; inserted: number; pages: number; errors: string[] }> {
    const allRegistrants: any[] = [];
    const errors: string[] = [];
    let pagesProcessed = 0;
    let nextPageToken: string | undefined;

    try {
      do {
        const pageResult = await this.fetchRegistrantsPage(webinarId, nextPageToken);
        allRegistrants.push(...pageResult.data);
        nextPageToken = pageResult.nextPageToken;
        pagesProcessed++;

        // Rate limiting
        if (nextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } while (nextPageToken);

      // Batch insert registrants
      const insertedCount = await this.batchInsertParticipants(allRegistrants, 'registrant', webinarId);

      return {
        total: allRegistrants.length,
        inserted: insertedCount,
        pages: pagesProcessed,
        errors
      };

    } catch (error) {
      errors.push(`Registrants processing error: ${error.message}`);
      return {
        total: allRegistrants.length,
        inserted: 0,
        pages: pagesProcessed,
        errors
      };
    }
  }

  private async processAttendees(webinarId: string): Promise<{ total: number; inserted: number; pages: number; errors: string[] }> {
    const allAttendees: any[] = [];
    const errors: string[] = [];
    let pagesProcessed = 0;
    let nextPageToken: string | undefined;

    try {
      do {
        const pageResult = await this.fetchAttendeesPage(webinarId, nextPageToken);
        allAttendees.push(...pageResult.data);
        nextPageToken = pageResult.nextPageToken;
        pagesProcessed++;

        // Rate limiting
        if (nextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } while (nextPageToken);

      // Batch insert attendees
      const insertedCount = await this.batchInsertParticipants(allAttendees, 'attendee', webinarId);

      return {
        total: allAttendees.length,
        inserted: insertedCount,
        pages: pagesProcessed,
        errors
      };

    } catch (error) {
      errors.push(`Attendees processing error: ${error.message}`);
      return {
        total: allAttendees.length,
        inserted: 0,
        pages: pagesProcessed,
        errors
      };
    }
  }

  private async fetchRegistrantsPage(webinarId: string, nextPageToken?: string): Promise<{ data: any[]; nextPageToken?: string }> {
    const url = new URL(`https://api.zoom.us/v2/webinars/${webinarId}/registrants`);
    url.searchParams.set('page_size', '300');
    if (nextPageToken) {
      url.searchParams.set('next_page_token', nextPageToken);
    }

    const response = await this.makeApiCall(url.toString());
    return {
      data: response.registrants || [],
      nextPageToken: response.next_page_token
    };
  }

  private async fetchAttendeesPage(webinarId: string, nextPageToken?: string): Promise<{ data: any[]; nextPageToken?: string }> {
    const url = new URL(`https://api.zoom.us/v2/webinars/${webinarId}/participants`);
    url.searchParams.set('page_size', '300');
    if (nextPageToken) {
      url.searchParams.set('next_page_token', nextPageToken);
    }

    const response = await this.makeApiCall(url.toString());
    return {
      data: response.participants || [],
      nextPageToken: response.next_page_token
    };
  }

  private async makeApiCall(url: string, retries = 3): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 429) {
          // Rate limit - exponential backoff
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`[ParticipantDataProcessor] Rate limit hit, waiting ${waitTime}ms (attempt ${attempt}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();

      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        console.log(`[ParticipantDataProcessor] API call failed (attempt ${attempt}/${retries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  private async batchInsertParticipants(participants: any[], type: 'registrant' | 'attendee', webinarId: string): Promise<number> {
    if (participants.length === 0) return 0;

    const batchSize = 1000;
    let totalInserted = 0;

    for (let i = 0; i < participants.length; i += batchSize) {
      const batch = participants.slice(i, i + batchSize);
      
      try {
        const records = batch.map(participant => ({
          user_id: this.userId,
          webinar_id: webinarId,
          participant_type: type,
          name: participant.name || `${participant.first_name || ''} ${participant.last_name || ''}`.trim(),
          email: participant.email,
          participant_id: participant.id || participant.registrant_id,
          join_time: participant.join_time,
          leave_time: participant.leave_time,
          duration: participant.duration,
          raw_data: participant
        }));

        const { data, error } = await this.supabase
          .from('zoom_webinar_participants')
          .insert(records)
          .select('id');

        if (error) {
          console.error(`[ParticipantDataProcessor] Batch insert error:`, error);
          throw error;
        }

        totalInserted += data?.length || 0;
        console.log(`[ParticipantDataProcessor] Inserted batch: ${data?.length || 0} ${type}s`);

        // Small delay between batches
        if (i + batchSize < participants.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }

      } catch (error) {
        console.error(`[ParticipantDataProcessor] Failed to insert batch:`, error);
        throw error;
      }
    }

    return totalInserted;
  }
}
