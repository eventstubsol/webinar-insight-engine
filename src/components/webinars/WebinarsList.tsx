
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
      
      {viewMode === 'grid' ? (
        <WebinarGridView 
          webinars={paginatedWebinars} 
          isLoading={false}
          error={error || null}
          errorDetails={{}}
          onDismissError={() => {}}
          errorBannerDismissed={true}
        />
      ) : (
        <WebinarListView 
          webinars={paginatedWebinars} 
          isLoading={false}
          error={error || null}
          errorDetails={{}}
          onDismissError={() => {}}
          errorBannerDismissed={true}
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
