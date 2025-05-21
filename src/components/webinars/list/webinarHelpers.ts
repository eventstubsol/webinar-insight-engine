
import { ZoomWebinar } from '@/hooks/useZoomApi';
import { WebinarStatus, statusMap } from './WebinarStatusBadge';

// Helper function to format Zoom webinar status
export const getWebinarStatus = (webinar: ZoomWebinar): WebinarStatus => {
  const now = new Date();
  const startTime = new Date(webinar.start_time);
  const endTime = new Date(startTime.getTime() + webinar.duration * 60000);
  
  if (webinar.status === 'cancelled') {
    return statusMap['cancelled'];
  } else if (now < startTime) {
    return statusMap['available'];
  } else if (now >= startTime && now <= endTime) {
    return statusMap['started'];
  } else {
    return statusMap['ended'];
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
