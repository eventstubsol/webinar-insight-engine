
import { ZoomParticipants } from '@/hooks/zoom';

/**
 * Safely cast participants data to the expected ZoomParticipants type
 * This ensures all operations on participant data are type-safe
 */
export const safeParticipantsCast = (participants: any): ZoomParticipants => {
  return {
    registrants: Array.isArray(participants.registrants) 
      ? participants.registrants.map((r: any) => ({
          id: r.id || '',
          email: r.email || '',
          first_name: r.first_name || '',
          last_name: r.last_name || '',
          create_time: r.create_time || '',
          join_url: r.join_url || '',
          status: r.status || ''
        }))
      : [],
    attendees: Array.isArray(participants.attendees) 
      ? participants.attendees.map((a: any) => ({
          id: a.id || '',
          name: a.name || '',
          user_email: a.user_email || '',
          join_time: a.join_time || '',
          leave_time: a.leave_time || '',
          duration: Number(a.duration || 0)
        }))
      : []
  };
};
