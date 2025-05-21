
import { ZoomWebinar } from '@/hooks/useZoomApi';
import { WebinarStatus, statusMap } from './WebinarStatusBadge';

// Helper function to format Zoom webinar status with improved accuracy
export const getWebinarStatus = (webinar: ZoomWebinar): WebinarStatus => {
  // First, check explicitly set status from API
  if (webinar.status === 'cancelled') {
    return statusMap['cancelled'];
  }
  
  const now = new Date();
  const startTime = webinar.start_time ? new Date(webinar.start_time) : null;
  
  // Handle webinars with no start time (drafts/pending)
  if (!startTime) {
    return statusMap['pending'];
  }
  
  const duration = webinar.duration || 60; // Default to 60 minutes if no duration
  const endTime = new Date(startTime.getTime() + duration * 60000);
  
  // First priority: Check explicit API status if available
  if (webinar.status === 'ended') {
    return statusMap['ended'];
  }
  
  // Second priority: Time-based logic with buffer for "started" status
  if (now < startTime) {
    // Add check for recurring webinars
    if (webinar.type === 9 || webinar.type === 6) {
      return statusMap['recurring'];
    }
    return statusMap['available']; // Upcoming
  } else if (now >= startTime && now <= endTime) {
    return statusMap['started']; // Live/ongoing
  } else {
    return statusMap['ended']; // Past/completed
  }
};

// Generate array for pagination
export const getPageNumbers = (currentPage: number, totalPages: number) => {
  const maxVisiblePages = 5; // Increased for better navigation
  let pages = [];
  
  if (totalPages <= maxVisiblePages) {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    // Always include first and last page
    if (currentPage <= 2) {
      pages = [1, 2, 3, '...', totalPages];
    } else if (currentPage >= totalPages - 1) {
      pages = [1, '...', totalPages - 2, totalPages - 1, totalPages];
    } else {
      pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    }
  }
  
  return pages;
};

// Helper function to check if a webinar is live with improved accuracy
export const isWebinarLive = (webinar: ZoomWebinar): boolean => {
  // If status is explicitly set to ended or cancelled, it's not live
  if (webinar.status === 'ended' || webinar.status === 'cancelled') {
    return false;
  }
  
  if (!webinar.start_time) {
    return false; // Without a start time, can't be live
  }
  
  const now = new Date();
  const startTime = new Date(webinar.start_time);
  const duration = webinar.duration || 60; // Default to 60 minutes if no duration
  const endTime = new Date(startTime.getTime() + duration * 60000);
  
  // A webinar is considered live if current time is between start and end time
  return now >= startTime && now <= endTime;
};

// Helper function to check if a webinar is upcoming with improved accuracy
export const isWebinarUpcoming = (webinar: ZoomWebinar): boolean => {
  // If status is explicitly set to ended or cancelled, it's not upcoming
  if (webinar.status === 'ended' || webinar.status === 'cancelled') {
    return false;
  }
  
  if (!webinar.start_time) {
    return true; // Webinars without start times are considered drafts/upcoming
  }
  
  const now = new Date();
  const startTime = new Date(webinar.start_time);
  
  // A webinar is upcoming if start time is in the future
  return now < startTime;
};

// Helper function to check if a webinar is past/completed with improved accuracy
export const isWebinarPast = (webinar: ZoomWebinar): boolean => {
  // If status is explicitly marked as ended, it's definitely past
  if (webinar.status === 'ended') {
    return true;
  }
  
  if (!webinar.start_time) {
    return false; // Webinars without start times can't be past
  }
  
  const now = new Date();
  const startTime = new Date(webinar.start_time);
  const duration = webinar.duration || 60; // Default to 60 minutes if no duration
  const endTime = new Date(startTime.getTime() + duration * 60000);
  
  // A webinar is also considered past if current time is after end time
  return now > endTime;
};

// New helper function to determine if a webinar is a draft
export const isWebinarDraft = (webinar: ZoomWebinar): boolean => {
  // Consider a webinar a draft if it has no start time or is explicitly marked as 'draft' status
  return !webinar.start_time || webinar.status === 'draft' || webinar.status === 'pending';
};

// New helper: Format participant numbers with better readability
export const formatParticipantCount = (count: number | undefined): string => {
  if (count === undefined) return '0';
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};
