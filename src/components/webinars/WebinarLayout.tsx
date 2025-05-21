
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { WebinarsList } from '@/components/webinars/WebinarsList';
import { WebinarFilters } from '@/components/webinars/WebinarFilters';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Grid, List, Info, X, Video, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ZoomWebinar } from '@/hooks/useZoomApi';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface WebinarLayoutProps {
  webinars: ZoomWebinar[];
  isLoading: boolean;
  error: Error | null;
  viewMode: 'list' | 'grid';
  filterTab: string;
  errorDetails?: {
    isMissingCredentials: boolean;
    isCapabilitiesError: boolean;
    isScopesError: boolean;
    missingSecrets: string[];
  };
  isRefetching?: boolean;
  lastSyncTime?: Date | null;
  onRefreshData?: () => void;
  onDismissError?: () => void;
  errorBannerDismissed: boolean; // Explicitly typed as boolean
}

export const WebinarLayout: React.FC<WebinarLayoutProps> = ({
  webinars,
  isLoading,
  error,
  viewMode,
  filterTab,
  errorDetails,
  isRefetching = false,
  lastSyncTime = null,
  onRefreshData,
  onDismissError,
  errorBannerDismissed = false // Default value if none provided
}) => {
  // Ensure it's always a boolean
  const dismissedAsBool: boolean = Boolean(errorBannerDismissed);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ 
    from: undefined, 
    to: undefined
  });
  
  // Show a subtle error only for non-critical errors
  const showSubtleError = !dismissedAsBool && 
    error && 
    errorDetails && 
    !errorDetails.isMissingCredentials && 
    !errorDetails.isScopesError;
  
  // For debugging only - remove in production
  const availableWebinars = webinars?.length || 0;
  
  // Calculate counts for each tab
  const liveCount = webinars.filter(w => {
    if (w.status === 'ended' || w.status === 'cancelled') return false;
    if (!w.start_time) return false;
    
    const now = new Date();
    const startTime = new Date(w.start_time);
    const duration = w.duration || 60;
    const endTime = new Date(startTime.getTime() + duration * 60000);
    
    return now >= startTime && now <= endTime;
  }).length;
  
  const upcomingCount = webinars.filter(w => {
    if (w.status === 'ended' || w.status === 'cancelled') return false;
    if (!w.start_time) return false;
    
    const now = new Date();
    const startTime = new Date(w.start_time);
    
    return now < startTime;
  }).length;
  
  const pastCount = webinars.filter(w => {
    if (w.status === 'ended') return true;
    if (!w.start_time) return false;
    
    const now = new Date();
    const startTime = new Date(w.start_time);
    const duration = w.duration || 60;
    const endTime = new Date(startTime.getTime() + duration * 60000);
    
    return now > endTime;
  }).length;
  
  const draftsCount = webinars.filter(w => 
    !w.start_time || w.status === 'draft' || w.status === 'pending'
  ).length;
  
  const formatLastSyncTime = () => {
    if (!lastSyncTime) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    
    return lastSyncTime.toLocaleDateString();
  };
  
  return (
    <div className="grid gap-6 mt-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-[15px] gap-4">
            {/* Webinar Type Tabs */}
            <Tabs 
              value={filterTab} 
              onValueChange={(value) => window.dispatchEvent(new CustomEvent('filterTabChange', { detail: value }))}
              className="flex-1 overflow-x-auto"
            >
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="all">All ({availableWebinars})</TabsTrigger>
                <TabsTrigger value="live" className="flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  Live ({liveCount})
                </TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming ({upcomingCount})</TabsTrigger>
                <TabsTrigger value="past">Past ({pastCount})</TabsTrigger>
                <TabsTrigger value="drafts">Drafts ({draftsCount})</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-2">
              {/* Last synced indicator */}
              {lastSyncTime && (
                <span className="text-xs text-muted-foreground hidden md:block">
                  Last updated: {formatLastSyncTime()}
                </span>
              )}
              
              {/* Manual refresh button */}
              {onRefreshData && (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={onRefreshData} 
                  disabled={isLoading || isRefetching}
                  className="ml-2"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
              
              {/* Toggle Group */}
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(value) => value && window.dispatchEvent(new CustomEvent('viewModeChange', { detail: value }))}
                className="ml-2"
              >
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="grid" aria-label="Grid view">
                  <Grid className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          
          {/* Subtle error alert for recoverable errors */}
          {showSubtleError && (
            <Alert variant="warning" className="mt-4 mb-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {errorDetails?.isCapabilitiesError 
                    ? 'Your Zoom account may not have webinar capabilities.' 
                    : 'Some webinar data may not be available.'}
                </span>
                {onDismissError && (
                  <Button 
                    onClick={onDismissError} 
                    variant="ghost" 
                    size="sm"
                    className="px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Search and Filter */}
          <div className="mt-4">
            <WebinarFilters 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>
          
          {/* Display sync status */}
          {isRefetching && (
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
              Syncing webinar data...
            </div>
          )}
        </CardHeader>
        <CardContent>
          <WebinarsList 
            webinars={webinars} 
            isLoading={isLoading} 
            isRefetching={isRefetching}
            error={error}
            viewMode={viewMode}
            filterTab={filterTab}
            searchQuery={searchQuery}
            dateRange={dateRange}
          />
        </CardContent>
      </Card>
    </div>
  );
};
