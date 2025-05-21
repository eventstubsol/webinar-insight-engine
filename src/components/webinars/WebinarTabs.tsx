
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WebinarSetupGuide } from './WebinarSetupGuide';
import { WebinarLayout } from './WebinarLayout';
import { ZoomWebinar } from '@/hooks/useZoomApi';

interface WebinarTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  errorMessage: string | null;
  errorDetails: {
    isMissingCredentials: boolean;
    isCapabilitiesError: boolean;
    isScopesError: boolean;
    missingSecrets: string[];
  };
  verified: boolean | undefined;
  isVerifying: boolean;
  verificationDetails: any;
  scopesError: boolean;
  webinars: ZoomWebinar[];
  isLoading: boolean;
  isFirstLoad: boolean;
  error: Error | null;
  viewMode: 'list' | 'grid';
  filterTab: string;
  errorBannerDismissed: boolean;
  onDismissError: () => void;
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
  errorBannerDismissed,
  onDismissError
}) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <div className="border-b">
        <TabsList className="bg-transparent border-b-0 max-w-none overflow-auto pb-px">
          <TabsTrigger value="webinars" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">
            Webinars
          </TabsTrigger>
          <TabsTrigger value="setup" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">
            Integration Setup
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">
            Reports
          </TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="webinars" className="space-y-4">
        <WebinarLayout 
          webinars={webinars} 
          isLoading={isLoading} 
          error={error}
          viewMode={viewMode}
          filterTab={filterTab}
          errorDetails={errorDetails}
          onDismissError={onDismissError}
          errorBannerDismissed={errorBannerDismissed}
        />
      </TabsContent>
      
      <TabsContent value="setup" className="space-y-4">
        <WebinarSetupGuide 
          errorMessage={errorMessage}
          errorDetails={errorDetails}
          verified={verified}
          isVerifying={isVerifying}
          verificationDetails={verificationDetails}
          scopesError={scopesError}
        />
      </TabsContent>
      
      <TabsContent value="reports" className="space-y-4">
        <div className="p-8 text-center text-muted-foreground">
          Reports functionality coming soon
        </div>
      </TabsContent>
    </Tabs>
  );
};
