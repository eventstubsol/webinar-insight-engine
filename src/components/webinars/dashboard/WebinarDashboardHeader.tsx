import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DurationDebugPanel } from './DurationDebugPanel';
import { ZoomWebinar } from '@/hooks/zoom';

interface WebinarDashboardHeaderProps {
  webinar: ZoomWebinar;
  isLoading: boolean;
  onRefresh: () => void;
}

export const WebinarDashboardHeader: React.FC<WebinarDashboardHeaderProps> = ({
  webinar,
  isLoading,
  onRefresh
}) => {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  
  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);
  
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onRefresh();
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">{webinar.topic}</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          {(webinar.status === 'ended' || webinar.status === 'stopped') && 
           !webinar.actual_duration && (
            <DurationDebugPanel 
              webinar={webinar}
              onDurationEnhanced={onRefresh}
            />
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isLoading || isSyncing}
          >
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" style={{ animationPlayState: (isLoading || isSyncing) ? 'running' : 'paused' }} />
            {isLoading || isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>
    </div>
  );
};
