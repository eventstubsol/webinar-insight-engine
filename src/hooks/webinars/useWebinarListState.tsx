import { useState, useMemo } from 'react';
import { ZoomWebinar } from '@/hooks/useZoomApi';
import { isWebinarLive, isWebinarUpcoming, isWebinarPast } from '@/components/webinars/list/webinarHelpers';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface UseWebinarListStateProps {
  webinars: ZoomWebinar[];
  filterTab: string;
  viewMode: 'list' | 'grid';
  searchQuery: string;
  dateRange: DateRange;
}

export const useWebinarListState = ({ 
  webinars = [], 
  filterTab, 
  viewMode, 
  searchQuery, 
  dateRange 
}: UseWebinarListStateProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWebinars, setSelectedWebinars] = useState<string[]>([]);
  const itemsPerPage = viewMode === 'grid' ? 12 : 10;

  // Filter webinars based on search query, date range, and tab selection
  const filteredWebinars = useMemo(() => {
    // Reset to page 1 when filters change
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    
    let filtered = webinars;
    
    // Apply search filter if query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(webinar => 
        (webinar.topic?.toLowerCase().includes(query)) || 
        (webinar.host_email?.toLowerCase().includes(query))
      );
    }
    
    // Apply date range filter if dates are selected
    if (dateRange.from) {
      const startDate = new Date(dateRange.from);
      startDate.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(webinar => {
        if (!webinar.start_time) return false;
        
        const webinarDate = new Date(webinar.start_time);
        
        // If only start date is selected, filter for webinars on or after that date
        if (!dateRange.to) {
          return webinarDate >= startDate;
        }
        
        // If both start and end dates are selected, filter for webinars within that range
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        return webinarDate >= startDate && webinarDate <= endDate;
      });
    }
    
    // Filter webinars based on the selected tab
    if (filterTab !== 'all') {
      filtered = filtered.filter(webinar => {
        switch(filterTab) {
          case 'live':
            return isWebinarLive(webinar);
          case 'upcoming':
            return isWebinarUpcoming(webinar);
          case 'past':
            return isWebinarPast(webinar);
          case 'drafts':
            // Assuming drafts might be a specific status you want to add
            return false; // Currently no draft status in our data model
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [webinars, searchQuery, dateRange, filterTab, currentPage]);

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredWebinars.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWebinars = filteredWebinars.slice(startIndex, startIndex + itemsPerPage);

  // Handle checkbox selection of webinars
  const handleWebinarSelection = (webinarId: string) => {
    setSelectedWebinars(prev => {
      if (prev.includes(webinarId)) {
        return prev.filter(id => id !== webinarId);
      } else {
        return [...prev, webinarId];
      }
    });
  };

  // Handle "select all" functionality
  const handleSelectAll = () => {
    if (selectedWebinars.length === paginatedWebinars.length) {
      // If all are selected, deselect all
      setSelectedWebinars([]);
    } else {
      // Otherwise select all
      setSelectedWebinars(paginatedWebinars.map(webinar => webinar.id));
    }
  };

  return {
    searchQuery,
    currentPage,
    setCurrentPage,
    selectedWebinars,
    filteredWebinars,
    paginatedWebinars,
    totalPages,
    handleWebinarSelection,
    handleSelectAll,
    itemsPerPage
  };
};
