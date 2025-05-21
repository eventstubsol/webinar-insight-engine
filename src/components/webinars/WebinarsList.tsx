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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface WebinarsListProps {
  webinars: ZoomWebinar[];
  isLoading: boolean;
  isRefetching?: boolean;
  error?: Error | null;
  viewMode: 'list' | 'grid';
  filterTab: string;
  searchQuery: string;
  dateRange: DateRange;
}

export const WebinarsList: React.FC<WebinarsListProps> = ({ 
  webinars = [], 
  isLoading, 
  isRefetching = false,
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
    filteredWebinars,
    handleWebinarSelection,
    handleSelectAll,
    itemsPerPage
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

  // If no webinars at all, show empty state
  if (webinars.length === 0) {
    return <WebinarEmptyState 
      isEmpty={true} 
      isFiltered={false} 
      isRefetching={isRefetching}
      message="No webinars found. Connect your Zoom account to sync your webinars."
    />;
  }
  
  // If filtered down to zero webinars, show filtered empty state
  if (filteredWebinars.length === 0) {
    return <WebinarEmptyState 
      isEmpty={false}
      isFiltered={true} 
      isRefetching={isRefetching}
      message="No webinars match your current filters. Try adjusting your search or filter criteria."
    />;
  }

  // Show webinars count info if we have more webinars than what's shown on the page
  const showWebinarCountInfo = filteredWebinars.length > itemsPerPage;

  return (
    <>
      {error && <WebinarError error={error} />}
      
      {showWebinarCountInfo && (
        <Alert variant="default" className="mb-4">
          <div className="flex items-center">
            <Info className="h-4 w-4 mr-2" />
            <AlertDescription>
              Showing {paginatedWebinars.length} of {filteredWebinars.length} webinars. Use pagination to see more.
            </AlertDescription>
          </div>
        </Alert>
      )}
      
      {viewMode === 'grid' ? (
        <WebinarGridView 
          webinars={paginatedWebinars} 
          selectedWebinars={selectedWebinars}
          handleWebinarSelection={handleWebinarSelection}
          isRefetching={isRefetching}
        />
      ) : (
        <WebinarListView 
          webinars={paginatedWebinars} 
          selectedWebinars={selectedWebinars}
          handleWebinarSelection={handleWebinarSelection}
          handleSelectAll={handleSelectAll}
          isRefetching={isRefetching}
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
