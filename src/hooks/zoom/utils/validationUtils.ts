
import { ZoomWebinar, ZoomParticipants } from '../types';

/**
 * Data validation utility for Zoom API data
 */
export class DataValidator {
  /**
   * Validates webinar data structure
   */
  static validateWebinar(webinar: any): ZoomWebinar {
    // Check for required fields
    if (!webinar) throw new Error('Webinar data is null or undefined');
    if (!webinar.id) throw new Error('Webinar ID is missing');
    if (!webinar.uuid) throw new Error('Webinar UUID is missing');
    
    // Ensure types are correct
    if (typeof webinar.id !== 'string') throw new Error('Webinar ID must be a string');
    if (webinar.duration && typeof webinar.duration !== 'number') {
      webinar.duration = parseInt(webinar.duration) || 0;
    }
    
    // Ensure valid start_time format if present
    if (webinar.start_time && !isValidDateString(webinar.start_time)) {
      console.warn(`Invalid start_time format for webinar ${webinar.id}: ${webinar.start_time}`);
      // Try to fix the date if possible, otherwise set to null
      webinar.start_time = tryFixDateString(webinar.start_time);
    }
    
    return webinar as ZoomWebinar;
  }
  
  /**
   * Validates participants data structure
   */
  static validateParticipants(participants: any): ZoomParticipants {
    if (!participants) {
      // Return empty structure if missing
      return { registrants: [], attendees: [] };
    }
    
    // Ensure registrants is an array
    if (!Array.isArray(participants.registrants)) {
      participants.registrants = [];
    }
    
    // Ensure attendees is an array
    if (!Array.isArray(participants.attendees)) {
      participants.attendees = [];
    }
    
    // Validate each registrant entry
    participants.registrants = participants.registrants.filter(registrant => {
      try {
        if (!registrant || typeof registrant !== 'object') return false;
        
        // Ensure email exists
        if (!registrant.email) {
          console.warn('Registrant is missing email, skipping');
          return false;
        }
        
        return true;
      } catch (err) {
        console.error('Error validating registrant:', err);
        return false;
      }
    });
    
    // Validate each attendee entry
    participants.attendees = participants.attendees.filter(attendee => {
      try {
        if (!attendee || typeof attendee !== 'object') return false;
        
        // Ensure duration is a number
        if (attendee.duration !== undefined && typeof attendee.duration !== 'number') {
          attendee.duration = parseInt(attendee.duration) || 0;
        }
        
        // Validate join and leave time formats
        if (attendee.join_time && !isValidDateString(attendee.join_time)) {
          attendee.join_time = tryFixDateString(attendee.join_time);
        }
        
        if (attendee.leave_time && !isValidDateString(attendee.leave_time)) {
          attendee.leave_time = tryFixDateString(attendee.leave_time);
        }
        
        return true;
      } catch (err) {
        console.error('Error validating attendee:', err);
        return false;
      }
    });
    
    return participants as ZoomParticipants;
  }
}

/**
 * Checks if a string is a valid ISO date string or timestamp
 */
function isValidDateString(dateStr: string): boolean {
  if (!dateStr) return false;
  
  try {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Attempts to fix an invalid date string
 */
function tryFixDateString(dateStr: string): string | null {
  if (!dateStr) return null;
  
  try {
    // Try different formats
    // 1. Try ISO format directly
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date.toISOString();
    
    // 2. Try timestamp (seconds)
    const timestamp = parseInt(dateStr);
    if (!isNaN(timestamp)) {
      date = new Date(timestamp * 1000); // Convert seconds to milliseconds
      if (!isNaN(date.getTime())) return date.toISOString();
    }
    
    // 3. Try different regional formats
    // ...additional format handling...
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Performs consistency checks on webinar data
 */
export function checkWebinarConsistency(webinar: ZoomWebinar, participants: ZoomParticipants): string[] {
  const issues: string[] = [];
  
  // Check if webinar has participants data
  if (webinar.status === 'ended' && (!participants || participants.attendees.length === 0)) {
    issues.push(`Webinar ${webinar.id} is ended but has no attendee data`);
  }
  
  // Check for attendees without registration
  if (participants && participants.registrants.length > 0 && participants.attendees.length > 0) {
    const registrantEmails = new Set(participants.registrants.map(r => r.email.toLowerCase()));
    const unmatchedAttendees = participants.attendees.filter(a => 
      a.user_email && !registrantEmails.has(a.user_email.toLowerCase())
    );
    
    if (unmatchedAttendees.length > 0) {
      issues.push(`${unmatchedAttendees.length} attendees not found in registrant list`);
    }
  }
  
  return issues;
}
