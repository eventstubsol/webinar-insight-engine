
import React from 'react';

interface WebinarEmptyStateProps {
  isEmpty: boolean;
  isFiltered: boolean;
}

export const WebinarEmptyState: React.FC<WebinarEmptyStateProps> = ({ isEmpty, isFiltered }) => {
  return (
    <div className="text-center py-8 text-muted-foreground">
      {isEmpty ? 
        'No webinars found. Connect to Zoom to sync your webinars.' : 
        'No webinars found matching your criteria'}
    </div>
  );
};
