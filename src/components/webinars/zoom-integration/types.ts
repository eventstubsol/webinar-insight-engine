
export interface ZoomCredentials {
  account_id: string;
  client_id: string;
  client_secret: string;
}

export interface VerificationDetails {
  success: boolean;
  message?: string;
  user_email?: string;
  user?: {
    email?: string;
    account_id?: string;
  };
}

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
