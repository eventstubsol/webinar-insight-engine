
import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarHeader } from '@/components/webinars/WebinarHeader';
import { WebinarTabs } from '@/components/webinars/WebinarTabs';
import { WebinarLayout } from '@/components/webinars/WebinarLayout';
import { WebinarAlerts } from '@/components/webinars/WebinarAlerts';
import { ZoomIntegrationWizard } from '@/components/webinars/ZoomIntegrationWizard';
import { useWebinarState } from '@/hooks/webinars/useWebinarState';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

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
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange,
    handleSetupZoom,
    handleWizardComplete,
    errorMessage,
    dismissErrorBanner,
    errorBannerDismissed
  } = useWebinarState();

  // Force it to be a boolean type for certainty
  const dismissedAsBool: boolean = Boolean(errorBannerDismissed);
  
  // Only show the full error banner when there's a confirmed critical error after initial loading
  // and the banner hasn't been dismissed by the user
  const showErrorBanner = !isLoading && 
    !isFirstLoad && 
    !dismissedAsBool &&
    (
      (error && (errorDetails.isMissingCredentials || errorDetails.isScopesError)) || 
      (errorDetails.isCapabilitiesError)
    );

  // Determine if we should show the tabs or layout
  // Only show tabs when user explicitly selected the setup tab OR
  // we have critical errors that require configuration
  const showTabs = activeTab === "setup" || 
    (showErrorBanner && (errorDetails.isMissingCredentials || errorDetails.isScopesError));

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
            <DialogTitle className="sr-only">Zoom Integration Setup</DialogTitle>
            <ZoomIntegrationWizard 
              onComplete={handleWizardComplete}
              onCancel={() => setShowWizard(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Only show WebinarAlerts when first connecting, not during normal loading */}
        {!verified && !isFirstLoad && (
          <WebinarAlerts
            credentialsStatus={credentialsStatus}
            verified={verified}
            showWizard={showWizard}
            onSetupZoom={handleSetupZoom}
            onDismissError={dismissErrorBanner}
            errorBannerDismissed={dismissedAsBool}
          />
        )}

        {isFirstLoad ? (
          // Show loading skeletons during first load instead of error state
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-60 rounded-lg" />
              ))}
            </div>
          </div>
        ) : showTabs ? (
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
            errorBannerDismissed={dismissedAsBool}
            onDismissError={dismissErrorBanner}
          />
        ) : (
          <WebinarLayout 
            webinars={webinars} 
            isLoading={isLoading} 
            error={error}
            viewMode={viewMode}
            filterTab={filterTab}
            errorDetails={errorDetails}
            onDismissError={dismissErrorBanner}
            errorBannerDismissed={dismissedAsBool}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default Webinars;
