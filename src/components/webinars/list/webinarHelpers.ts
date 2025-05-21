import { ZoomWebinar } from '@/hooks/useZoomApi';
import { WebinarStatus, statusMap } from './WebinarStatusBadge';

// Helper function to format Zoom webinar status
export const getWebinarStatus = (webinar: ZoomWebinar): WebinarStatus => {
  // Check if the webinar has an explicit 'ended' status from Zoom API
  if (webinar.status === 'cancelled') {
    return statusMap['cancelled'];
  }
  
  const now = new Date();
  const startTime = new Date(webinar.start_time);
  const endTime = new Date(startTime.getTime() + webinar.duration * 60000);
  
  // First priority: Check explicit API status if available
  if (webinar.status === 'ended') {
    return statusMap['ended'];
  }
  
  // Second priority: Time-based logic
  if (now < startTime) {
    return statusMap['available']; // Upcoming
  } else if (now >= startTime && now <= endTime) {
    return statusMap['started']; // Live/ongoing
  } else {
    return statusMap['ended']; // Past/completed
  }
};

// Generate array for pagination
export const getPageNumbers = (currentPage: number, totalPages: number) => {
  const maxVisiblePages = 3;
  let pages = [];
  
  if (totalPages <= maxVisiblePages) {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    if (currentPage <= 2) {
      pages = [1, 2, 3];
    } else if (currentPage >= totalPages - 1) {
      pages = [totalPages - 2, totalPages - 1, totalPages];
    } else {
      pages = [currentPage - 1, currentPage, currentPage + 1];
    }
  }
  
  return pages;
};

// Helper function to check if a webinar is live
export const isWebinarLive = (webinar: ZoomWebinar): boolean => {
  // If status is explicitly set to ended or cancelled, it's not live
  if (webinar.status === 'ended' || webinar.status === 'cancelled') {
    return false;
  }
  
  const now = new Date();
  const startTime = new Date(webinar.start_time);
  const endTime = new Date(startTime.getTime() + webinar.duration * 60000);
  
  // A webinar is considered live if current time is between start and end time
  return now >= startTime && now <= endTime;
};

// Helper function to check if a webinar is upcoming
export const isWebinarUpcoming = (webinar: ZoomWebinar): boolean => {
  // If status is explicitly set to ended or cancelled, it's not upcoming
  if (webinar.status === 'ended' || webinar.status === 'cancelled') {
    return false;
  }
  
  const now = new Date();
  const startTime = new Date(webinar.start_time);
  
  // A webinar is upcoming if start time is in the future
  return now < startTime;
};

// Helper function to check if a webinar is past/completed
export const isWebinarPast = (webinar: ZoomWebinar): boolean => {
  // If status is explicitly marked as ended, it's definitely past
  if (webinar.status === 'ended') {
    return true;
  }
  
  const now = new Date();
  const startTime = new Date(webinar.start_time);
  const endTime = new Date(startTime.getTime() + webinar.duration * 60000);
  
  // A webinar is also considered past if current time is after end time
  return now > endTime;
};
