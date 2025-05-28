
import React from 'react';
import { WebinarCard } from '../WebinarCard';
import { WebinarLoading } from './WebinarLoading';
import { WebinarEmptyState } from './WebinarEmptyState';
import { WebinarError } from './WebinarError';
import { ZoomWebinar } from '@/hooks/zoom';

interface WebinarGridViewProps {
  webinars: ZoomWebinar[];
  isLoading: boolean;
  error: Error | null;
  errorDetails: any;
  onDismissError: () => void;
  errorBannerDismissed: boolean;
}

export const WebinarGridView: React.FC<WebinarGridViewProps> = ({
  webinars,
  isLoading,
  error,
  errorDetails,
  onDismissError,
  errorBannerDismissed
}) => {
  if (isLoading) {
    return <WebinarLoading />;
  }

  if (error && !errorBannerDismissed) {
    return (
      <WebinarError 
        error={error}
      />
    );
  }

  if (!webinars || webinars.length === 0) {
    return <WebinarEmptyState isEmpty={true} isFiltered={false} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {webinars.map((webinar) => (
        <WebinarCard
          key={webinar.webinar_id}
          webinar={webinar}
        />
      ))}
    </div>
  );
};
