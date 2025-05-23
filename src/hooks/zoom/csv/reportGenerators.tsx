
import { ZoomWebinar, ZoomParticipants } from '../types';
import { formatDate, formatDateTime, formatMinutes } from '@/utils/formatUtils';

/**
 * Generates registrant report data
 */
export const generateRegistrantReportData = (
  webinar: ZoomWebinar,
  participants?: ZoomParticipants
) => {
  if (!participants?.registrants || participants.registrants.length === 0) {
    return [];
  }
  
  return participants.registrants.map(registrant => ({
    Email: registrant.email || '',
    FirstName: registrant.first_name || '',
    LastName: registrant.last_name || '',
    FullName: `${registrant.first_name || ''} ${registrant.last_name || ''}`.trim(),
    RegistrationTime: registrant.create_time ? formatDateTime(new Date(registrant.create_time)) : '',
    Status: registrant.status || '',
    JoinUrl: registrant.join_url || ''
  }));
};

/**
 * Generates attendee report data
 */
export const generateAttendeeReportData = (
  webinar: ZoomWebinar,
  participants?: ZoomParticipants
) => {
  if (!participants?.attendees || participants.attendees.length === 0) {
    return [];
  }
  
  return participants.attendees.map(attendee => ({
    Email: attendee.user_email || '',
    Name: attendee.name || '',
    JoinTime: attendee.join_time ? formatDateTime(new Date(attendee.join_time)) : '',
    LeaveTime: attendee.leave_time ? formatDateTime(new Date(attendee.leave_time)) : '',
    Duration: formatMinutes(Math.floor((attendee.duration || 0) / 60)),
    DurationInMinutes: Math.floor((attendee.duration || 0) / 60)
  }));
};

/**
 * Generates analytics report data
 */
export const generateAnalyticsReportData = (
  webinar: ZoomWebinar,
  participants?: ZoomParticipants
) => {
  return [{
    WebinarName: webinar.topic,
    Date: formatDate(webinar.start_time ? new Date(webinar.start_time) : new Date()),
    TotalRegistrants: participants?.registrants?.length || 0,
    TotalAttendees: participants?.attendees?.length || 0,
    AttendanceRate: participants?.registrants?.length ? 
      `${Math.round((participants?.attendees?.length || 0) / participants.registrants.length * 100)}%` : '0%',
    AverageDuration: participants?.attendees?.length ? 
      formatMinutes(Math.round(participants.attendees.reduce((sum, a) => sum + (a.duration || 0), 0) / participants.attendees.length / 60)) : '0m',
    WebinarDuration: formatMinutes(webinar.duration || 0),
    Host: webinar.host_email || 'Unknown'
  }];
};
