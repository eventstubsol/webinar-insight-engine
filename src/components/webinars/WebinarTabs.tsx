
import React from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { WebinarError } from '@/components/webinars/WebinarError';
import { WebinarSetupGuide } from '@/components/webinars/WebinarSetupGuide';
import { WebinarLayout } from '@/components/webinars/WebinarLayout';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Info, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WebinarTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  errorMessage: string;
  errorDetails: {
    isMissingCredentials: boolean;
    isCapabilitiesError: boolean;
    isScopesError: boolean;
    missingSecrets: string[];
  };
  verified: boolean;
  isVerifying: boolean;
  verificationDetails: any;
  scopesError: boolean;
  webinars: any[];
  isLoading: boolean;
  isFirstLoad: boolean;
  error: Error | null;
  viewMode: 'list' | 'grid';
  filterTab: string;
  errorBannerDismissed?: boolean;
  onDismissError?: () => void;
}

export const WebinarTabs: React.FC<WebinarTabsProps> = ({
  activeTab,
  setActiveTab,
  errorMessage,
  errorDetails,
  verified,
  isVerifying,
  verificationDetails,
  scopesError,
  webinars,
  isLoading,
  isFirstLoad,
  error,
  viewMode,
  filterTab,
  errorBannerDismissed = false,
  onDismissError
}) => {
  // Only show the full error component in the webinars tab when it's a critical configuration error
  // that requires user attention
  const showFullError = !isLoading && 
    !isFirstLoad && 
    !errorBannerDismissed && 
    activeTab === "webinars" && 
    (errorDetails.isMissingCredentials || errorDetails.isScopesError);
  
  // Use a less intrusive error indicator for non-critical errors
  const showSubtleError = !isLoading && 
    !isFirstLoad && 
    !errorBannerDismissed && 
    activeTab === "webinars" && 
    error && 
    !showFullError;

  // Clear in-memory error states when switching tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // If we're going to the setup tab, we can consider the error as "acknowledged"
    if (value === "setup" && onDismissError) {
      onDismissError();
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="webinars">Webinars</TabsTrigger>
        <TabsTrigger value="setup">API Setup</TabsTrigger>
      </TabsList>
      <TabsContent value="webinars">
        {/* Subtle error banner for non-critical issues */}
        {showSubtleError && (
          <Alert variant="warning" className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {errorDetails.isCapabilitiesError 
                  ? 'Your Zoom account may not have webinar capabilities.' 
                  : 'Connection issue with Zoom API. Check your settings.'}
              </span>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setActiveTab("setup")} 
                  variant="outline" 
                  size="sm"
                >
                  View Setup
                </Button>
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
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Full error only for critical configuration issues */}
        {showFullError && (
          <WebinarError 
            errorMessage={errorMessage}
            errorDetails={errorDetails}
            onSetupClick={() => setActiveTab("setup")}
            onDismiss={onDismissError}
          />
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-60 rounded-lg" />
              ))}
            </div>
          </div>
        ) : null}
        
        {!showFullError && !isLoading && (
          <WebinarLayout 
            webinars={webinars}
            isLoading={isLoading}
            error={null} // Don't pass error if we're already handling it above
            viewMode={viewMode}
            filterTab={filterTab}
            errorDetails={errorDetails}
          />
        )}
      </TabsContent>
      <TabsContent value="setup">
        <WebinarSetupGuide 
          scopesError={scopesError}
          isVerifying={isVerifying}
          verified={verified}
          verificationDetails={verificationDetails}
        />
        {verified && (
          <div className="flex justify-center mt-4">
            <Button onClick={() => setActiveTab("webinars")} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              View Your Webinars
            </Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};
