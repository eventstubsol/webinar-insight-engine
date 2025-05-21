
import { useState, useMemo } from 'react';
import { ZoomWebinar } from '@/hooks/useZoomApi';
import { isWebinarLive, isWebinarUpcoming, isWebinarPast } from '@/components/webinars/list/webinarHelpers';

interface UseWebinarListStateProps {
  webinars: ZoomWebinar[];
  filterTab: string;
  viewMode: 'list' | 'grid';
}

export const useWebinarListState = ({ webinars = [], filterTab, viewMode }: UseWebinarListStateProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWebinars, setSelectedWebinars] = useState<string[]>([]);
  const itemsPerPage = viewMode === 'grid' ? 12 : 10;

  // Filter webinars based on search query and tab selection
  const filteredWebinars = useMemo(() => {
    // Reset to page 1 when filters change
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    
    let filtered = webinars.filter(webinar => 
      webinar.topic?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      webinar.host_email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
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
  }, [webinars, searchQuery, filterTab, currentPage]);

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
    setSearchQuery,
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
