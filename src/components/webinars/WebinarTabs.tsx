
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
import { CheckCircle2 } from 'lucide-react';
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
  filterTab
}) => {
  // Only show error when there's a confirmed error after loading
  const showError = !isLoading && (error || errorDetails.isMissingCredentials || errorDetails.isScopesError);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="webinars">Webinars</TabsTrigger>
        <TabsTrigger value="setup">API Setup</TabsTrigger>
      </TabsList>
      <TabsContent value="webinars">
        {showError ? (
          <WebinarError 
            errorMessage={errorMessage}
            errorDetails={errorDetails}
            onSetupClick={() => setActiveTab("setup")}
          />
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-60 rounded-lg" />
              ))}
            </div>
          </div>
        ) : null}
        
        {!showError && !isLoading && (
          <WebinarLayout 
            webinars={webinars}
            isLoading={isLoading}
            error={null} // Don't pass error if we're already handling it above
            viewMode={viewMode}
            filterTab={filterTab}
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
