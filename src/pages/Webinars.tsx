
import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarHeader } from '@/components/webinars/WebinarHeader';
import { WebinarTabs } from '@/components/webinars/WebinarTabs';
import { WebinarLayout } from '@/components/webinars/WebinarLayout';
import { WebinarAlerts } from '@/components/webinars/WebinarAlerts';
import { ZoomIntegrationWizard } from '@/components/webinars/ZoomIntegrationWizard';
import { useWebinarState } from '@/hooks/webinars/useWebinarState';
import { Dialog, DialogContent } from "@/components/ui/dialog";

const Webinars = () => {
  const {
    webinars,
    isLoading,
    isRefetching,
    error,
    errorDetails,
    refreshWebinars,
    lastSyncTime,
    credentialsStatus,
    isVerifying,
    verified,
    scopesError,
    verificationDetails,
    isFirstLoad,
    activeTab,
    setActiveTab,
    showWizard,
    setShowWizard,
    viewMode,
    filterTab,
    handleSetupZoom,
    handleWizardComplete,
    errorMessage
  } = useWebinarState();

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <WebinarHeader 
          errorDetails={errorDetails}
          isRefetching={isRefetching}
          isLoading={isLoading}
          refreshWebinars={refreshWebinars}
          lastSyncTime={lastSyncTime}
          onSetupZoom={handleSetupZoom}
          credentialsStatus={credentialsStatus}
        />

        {/* Zoom Integration Wizard Dialog */}
        <Dialog open={showWizard} onOpenChange={setShowWizard}>
          <DialogContent className="max-w-4xl p-0">
            <ZoomIntegrationWizard 
              onComplete={handleWizardComplete}
              onCancel={() => setShowWizard(false)}
            />
          </DialogContent>
        </Dialog>

        <WebinarAlerts
          credentialsStatus={credentialsStatus}
          verified={verified}
          showWizard={showWizard}
          onSetupZoom={handleSetupZoom}
        />

        {errorDetails.isMissingCredentials || errorDetails.isScopesError || error ? (
          <WebinarTabs 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            errorMessage={errorMessage}
            errorDetails={errorDetails}
            verified={verified}
            isVerifying={isVerifying}
            verificationDetails={verificationDetails}
            scopesError={scopesError}
            webinars={webinars}
            isLoading={isLoading}
            isFirstLoad={isFirstLoad}
            error={error}
            viewMode={viewMode}
            filterTab={filterTab}
          />
        ) : (
          <WebinarLayout 
            webinars={webinars} 
            isLoading={isLoading || isFirstLoad} 
            error={error}
            viewMode={viewMode}
            filterTab={filterTab}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default Webinars;
