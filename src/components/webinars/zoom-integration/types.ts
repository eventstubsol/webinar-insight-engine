
import { VerificationDetails as VerificationDetailsBase } from '@/hooks/zoom/verification/types';
import { ZoomCredentials as ZoomCredentialsBase } from '@/hooks/zoom/verification/types';

// Re-export types to avoid conflicts
export type ZoomCredentials = ZoomCredentialsBase;
export type VerificationDetails = VerificationDetailsBase;

// Main steps of the wizard
export enum WizardStep {
  Introduction = 0,
  CreateApp = 1,
  ConfigureScopes = 2,
  EnterCredentials = 3,
  Success = 5
}

export interface ZoomIntegrationWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

// Add this interface for the useZoomIntegrationWizard hook's return type
export interface ZoomIntegrationWizardState {
  currentStep: WizardStep;
  credentials: ZoomCredentials;
  isSubmitting: boolean;
  error: string | null;
  scopesError: boolean;
  verificationDetails: VerificationDetails | null;
  verificationStage: string;
  hasCredentials: boolean;
  isLoadingCredentials: boolean;
  handleNext: () => void;
  handleBack: () => void;
  handleSaveCredentials: () => Promise<void>;
  handleChangeCredentials: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleComplete: () => void;
}
