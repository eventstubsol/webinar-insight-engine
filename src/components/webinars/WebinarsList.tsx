
import React from 'react';
import { ZoomWebinar } from '@/hooks/useZoomApi';
import { WebinarGridView } from './list/WebinarGridView';
import { WebinarListView } from './list/WebinarListView';
import { WebinarPagination } from './list/WebinarPagination';
import { WebinarError } from './list/WebinarError';
import { WebinarLoading } from './list/WebinarLoading';
import { WebinarEmptyState } from './list/WebinarEmptyState';
import { getPageNumbers } from './list/webinarHelpers';
import { useWebinarListState } from '@/hooks/webinars/useWebinarListState';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface WebinarsListProps {
  webinars: ZoomWebinar[];
  isLoading: boolean;
  error?: Error | null;
  viewMode: 'list' | 'grid';
  filterTab: string;
  searchQuery: string;
  dateRange: DateRange;
}

export const WebinarsList: React.FC<WebinarsListProps> = ({ 
  webinars = [], 
  isLoading, 
  error, 
  viewMode, 
  filterTab,
  searchQuery,
  dateRange
}) => {
  const {
    currentPage,
    setCurrentPage,
    selectedWebinars,
    paginatedWebinars,
    totalPages,
    handleWebinarSelection,
    handleSelectAll,
    itemsPerPage,
    filteredWebinars
  } = useWebinarListState({ 
    webinars, 
    filterTab, 
    viewMode, 
    searchQuery,
    dateRange 
  });

  // Check if this is minimal sync data
  const isMinimalSync = webinars.length > 0 && webinars[0]._minimal_sync;

  // If loading, show loading state
  if (isLoading) {
    return <WebinarLoading />;
  }

  // If no webinars after filtering, show empty state
  if (filteredWebinars.length === 0) {
    return <WebinarEmptyState isEmpty={webinars.length === 0} isFiltered={webinars.length > 0} />;
  }

  return (
    <>
      {error && <WebinarError error={error} />}
      
      {/* Show minimal sync notice */}
      {isMinimalSync && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Fast Sync Complete:</strong> Basic webinar data loaded successfully. 
            Enhanced features (participant data, recordings, detailed settings) can be loaded individually as needed.
          </AlertDescription>
        </Alert>
      )}
      
      {viewMode === 'grid' ? (
        <WebinarGridView 
          webinars={paginatedWebinars} 
          selectedWebinars={selectedWebinars}
          handleWebinarSelection={handleWebinarSelection}
        />
      ) : (
        <WebinarListView 
          webinars={paginatedWebinars} 
          selectedWebinars={selectedWebinars}
          handleWebinarSelection={handleWebinarSelection}
          handleSelectAll={handleSelectAll}
        />
      )}
      
      {filteredWebinars.length > itemsPerPage && (
        <WebinarPagination 
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          getPageNumbers={() => getPageNumbers(currentPage, totalPages)}
        />
      )}
    </>
  );
};
