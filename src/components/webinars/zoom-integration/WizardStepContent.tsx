
import React from 'react';
import { WizardStep } from './types';
import { IntroductionStep } from './IntroductionStep';
import { CreateAppStep } from './CreateAppStep';
import { ConfigureScopesStep } from './ConfigureScopesStep';
import { EnterCredentialsStep } from './EnterCredentialsStep';
import { SuccessStep } from './SuccessStep';

interface WizardStepContentProps {
  currentStep: WizardStep;
  wizard: any; // Using any to avoid circular dependencies
  onCancel?: () => void;
}

export const WizardStepContent: React.FC<WizardStepContentProps> = ({
  currentStep,
  wizard,
  onCancel
}) => {
  switch (currentStep) {
    case WizardStep.Introduction:
      return (
        <IntroductionStep 
          onNext={wizard.handleNext} 
          onCancel={onCancel} 
          hasCredentials={wizard.hasCredentials} 
        />
      );
      
    case WizardStep.CreateApp:
      return (
        <CreateAppStep 
          onNext={wizard.handleNext} 
          onBack={wizard.handleBack} 
        />
      );
      
    case WizardStep.ConfigureScopes:
      return (
        <ConfigureScopesStep 
          onNext={wizard.handleNext} 
          onBack={wizard.handleBack} 
          scopesError={wizard.scopesError}
        />
      );
      
    case WizardStep.EnterCredentials:
      return (
        <EnterCredentialsStep 
          onVerify={wizard.handleSaveCredentials} 
          onBack={wizard.handleBack}
          credentials={wizard.credentials}
          onChange={wizard.handleChangeCredentials}
          error={wizard.error}
          isSubmitting={wizard.isSubmitting}
          isLoadingCredentials={wizard.isLoadingCredentials}
          verificationStage={wizard.verificationStage}
        />
      );
      
    case WizardStep.Success:
      return (
        <SuccessStep 
          onComplete={wizard.handleComplete}
          verificationDetails={wizard.verificationDetails} 
        />
      );
      
    default:
      return (
        <IntroductionStep 
          onNext={wizard.handleNext} 
          onCancel={onCancel} 
          hasCredentials={wizard.hasCredentials} 
        />
      );
  }
};
