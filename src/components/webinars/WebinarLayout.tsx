
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
import { Grid, List, Info, X, Video } from 'lucide-react';
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
  
  return (
    <div className="grid gap-6 mt-4">
      <Card>
        <CardHeader>
          {/* Flex container that will now hold both tabs and toggle group */}
          <div className="flex items-center justify-between pb-[15px]">
            {/* Webinar Type Tabs - moved here and removed mt-6 class */}
            <Tabs value={filterTab} onValueChange={(value) => window.dispatchEvent(new CustomEvent('filterTabChange', { detail: value }))}>
              <TabsList>
                <TabsTrigger value="all">All Webinars ({availableWebinars})</TabsTrigger>
                <TabsTrigger value="live" className="flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  Live
                </TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
                <TabsTrigger value="drafts">Drafts</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Toggle Group - already on the right */}
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && window.dispatchEvent(new CustomEvent('viewModeChange', { detail: value }))}>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <Grid className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
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
        </CardHeader>
        <CardContent>
          <WebinarsList 
            webinars={webinars} 
            isLoading={isLoading} 
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
