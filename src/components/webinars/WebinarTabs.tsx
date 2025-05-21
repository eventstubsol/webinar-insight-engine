
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
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="webinars">Webinars</TabsTrigger>
        <TabsTrigger value="setup">API Setup</TabsTrigger>
      </TabsList>
      <TabsContent value="webinars">
        <WebinarError 
          errorMessage={errorMessage}
          errorDetails={errorDetails}
          onSetupClick={() => setActiveTab("setup")}
        />
        <WebinarLayout 
          webinars={webinars}
          isLoading={isLoading || isFirstLoad}
          error={error}
          viewMode={viewMode}
          filterTab={filterTab}
        />
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
