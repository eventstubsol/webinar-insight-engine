
import { useState, useMemo } from 'react';
import { ZoomWebinar } from '@/hooks/useZoomApi';
import { 
  isWebinarLive, 
  isWebinarUpcoming, 
  isWebinarPast,
  isWebinarDraft 
} from '@/components/webinars/list/webinarHelpers';

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
    
    // Make a copy of webinars to avoid mutating original array
    let filtered = [...webinars];
    
    console.log(`[useWebinarListState] Starting with ${filtered.length} webinars`);
    
    // Apply search filter if query exists
    if (searchQuery?.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(webinar => 
        (webinar.topic?.toLowerCase().includes(query)) || 
        (webinar.host_email?.toLowerCase().includes(query)) ||
        (webinar.agenda?.toLowerCase().includes(query)) ||
        (webinar.id?.toLowerCase().includes(query))
      );
      console.log(`[useWebinarListState] After search filter: ${filtered.length} webinars`);
    }
    
    // Apply date range filter if dates are selected
    if (dateRange?.from) {
      const startDate = new Date(dateRange.from);
      startDate.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(webinar => {
        // If webinar doesn't have a start_time, include it only if we're on drafts tab
        if (!webinar.start_time) {
          return filterTab === 'drafts';
        }
        
        // Ensure we're working with a proper Date object
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
      
      console.log(`[useWebinarListState] After date filter: ${filtered.length} webinars`);
    }
    
    // Filter webinars based on the selected tab
    if (filterTab && filterTab !== 'all') {
      filtered = filtered.filter(webinar => {
        switch(filterTab) {
          case 'live':
            return isWebinarLive(webinar);
          case 'upcoming':
            return isWebinarUpcoming(webinar);
          case 'past':
            return isWebinarPast(webinar);
          case 'drafts':
            return isWebinarDraft(webinar);
          default:
            return true;
        }
      });
      
      console.log(`[useWebinarListState] After tab filter (${filterTab}): ${filtered.length} webinars`);
    }
    
    // Ensure webinars are sorted by start_time with improved logic
    filtered.sort((a, b) => {
      // For drafts tab, sort by creation date if available
      if (filterTab === 'drafts') {
        // If both have no start time but have created_at
        if ((!a.start_time && !b.start_time) && a.raw_data?.created_at && b.raw_data?.created_at) {
          return new Date(b.raw_data.created_at).getTime() - new Date(a.raw_data.created_at).getTime();
        }
      }
      
      // For future webinars (upcoming tab), sort by closest first
      if (filterTab === 'upcoming') {
        if (a.start_time && b.start_time) {
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        }
      } else {
        // For past webinars, sort by most recent first
        if (a.start_time && b.start_time) {
          return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
        }
      }
      
      // Put webinars without start_time at the end (or at the beginning for drafts tab)
      if (!a.start_time && b.start_time) return filterTab === 'drafts' ? -1 : 1;
      if (a.start_time && !b.start_time) return filterTab === 'drafts' ? 1 : -1;
      
      // If all else fails, sort by ID or topic
      return (b.topic || '').localeCompare(a.topic || '');
    });
    
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
