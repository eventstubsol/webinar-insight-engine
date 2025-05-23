
import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { WizardStep } from './types';
import { ProgressIndicator } from './ProgressIndicator';
import { IntroductionStep } from './IntroductionStep';
import { CreateAppStep } from './CreateAppStep';
import { ConfigureScopesStep } from './ConfigureScopesStep';
import { EnterCredentialsStep } from './EnterCredentialsStep';
import { SuccessStep } from './SuccessStep';
import { useZoomIntegrationWizard } from './hooks/useZoomIntegrationWizard';
import { ZoomIntegrationWizardProps } from './types';
import { WizardStepContent } from './WizardStepContent';

export const ZoomIntegrationWizard: React.FC<ZoomIntegrationWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const wizard = useZoomIntegrationWizard();
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Zoom Integration Wizard</CardTitle>
        <CardDescription>
          Connect your Zoom account to access and manage your webinars
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <ProgressIndicator currentStep={wizard.currentStep} />
        <WizardStepContent 
          currentStep={wizard.currentStep}
          wizard={wizard}
          onCancel={onCancel}
        />
      </CardContent>
    </Card>
  );
};
