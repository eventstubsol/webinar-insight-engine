
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarsList } from '@/components/webinars/WebinarsList';
import { WebinarHeader } from '@/components/webinars/WebinarHeader';
import { WebinarError } from '@/components/webinars/WebinarError';
import { WebinarSetupGuide } from '@/components/webinars/WebinarSetupGuide';
import { useZoomWebinars, useZoomCredentialsVerification } from '@/hooks/useZoomApi';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CheckCircle2 } from 'lucide-react';

const Webinars = () => {
  const { webinars, isLoading, isRefetching, error, errorDetails, refreshWebinars } = useZoomWebinars();
  const { verifyCredentials, isVerifying, verified, scopesError, verificationDetails } = useZoomCredentialsVerification();
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("webinars");
  
  useEffect(() => {
    // Track if data has been loaded at least once
    if (!isLoading && isFirstLoad) {
      setIsFirstLoad(false);
    }

    // If we have credential errors or scope errors, automatically switch to the setup tab
    if ((error && (errorDetails.isMissingCredentials || errorDetails.isScopesError)) && activeTab !== "setup") {
      setActiveTab("setup");
    }
  }, [isLoading, error, errorDetails, activeTab]);
  
  const errorMessage = error?.message || 'An error occurred while connecting to the Zoom API';
  
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <WebinarHeader 
          errorDetails={errorDetails}
          isRefetching={isRefetching}
          isLoading={isLoading}
          refreshWebinars={refreshWebinars}
        />

        {errorDetails.isMissingCredentials || errorDetails.isScopesError || error ? (
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
              <div className="grid gap-6 mt-4">
                <WebinarsList webinars={webinars} isLoading={isLoading || isFirstLoad} error={error} />
              </div>
            </TabsContent>
            <TabsContent value="setup">
              <WebinarSetupGuide 
                scopesError={scopesError}
                verifyCredentials={verifyCredentials}
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
        ) : error ? (
          <>
            <WebinarError 
              errorMessage={errorMessage}
              errorDetails={errorDetails}
              onSetupClick={() => {}}
            />
            <div className="grid gap-6">
              <WebinarsList webinars={webinars} isLoading={isLoading || isFirstLoad} error={error} />
            </div>
          </>
        ) : (
          <div className="grid gap-6">
            <WebinarsList webinars={webinars} isLoading={isLoading || isFirstLoad} error={error} />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Webinars;
