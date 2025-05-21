
import React from 'react';
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
import { Grid, List, Info, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface WebinarLayoutProps {
  webinars: any[];
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
  errorBannerDismissed?: boolean;
}

export const WebinarLayout: React.FC<WebinarLayoutProps> = ({
  webinars,
  isLoading,
  error,
  viewMode,
  filterTab,
  errorDetails,
  onDismissError,
  errorBannerDismissed = false
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [dateFilter, setDateFilter] = React.useState<Date | undefined>(undefined);
  
  // Show a subtle error only for non-critical errors
  const showSubtleError = !errorBannerDismissed && 
    error && 
    errorDetails && 
    !errorDetails.isMissingCredentials && 
    !errorDetails.isScopesError;
  
  return (
    <div className="grid gap-6 mt-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Webinars</CardTitle>
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && window.dispatchEvent(new CustomEvent('viewModeChange', { detail: value }))}>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <Grid className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <CardDescription>Manage and view all your Zoom webinar sessions</CardDescription>
          
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
          
          {/* Webinar Type Tabs */}
          <Tabs value={filterTab} onValueChange={(value) => window.dispatchEvent(new CustomEvent('filterTabChange', { detail: value }))} className="mt-6">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Webinars</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Search and Filter */}
          <div className="mt-4">
            <WebinarFilters 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onDateFilterChange={setDateFilter}
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
          />
        </CardContent>
      </Card>
    </div>
  );
};
