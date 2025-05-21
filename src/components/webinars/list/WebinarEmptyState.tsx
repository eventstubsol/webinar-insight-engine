
import React from 'react';
import { Loader2 } from 'lucide-react';

interface WebinarEmptyStateProps {
  isEmpty: boolean;
  isFiltered: boolean;
  isRefetching?: boolean;
  message?: string;
}

export const WebinarEmptyState: React.FC<WebinarEmptyStateProps> = ({ 
  isEmpty, 
  isFiltered, 
  isRefetching = false,
  message 
}) => {
  const defaultMessage = isEmpty 
    ? 'No webinars found. Connect to Zoom to sync your webinars.' 
    : 'No webinars found matching your criteria';

  return (
    <div className="text-center py-8 text-muted-foreground">
      {isRefetching && (
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
      )}
      <p>{message || defaultMessage}</p>
    </div>
  );
};

