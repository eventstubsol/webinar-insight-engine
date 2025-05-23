
// Types for the verification flow process
export enum VerificationStage {
  Idle = 'idle',
  SavingCredentials = 'saving_credentials',
  ValidatingToken = 'validating_token',
  ValidatingScopes = 'validating_scopes',
  Complete = 'complete',
  Failed = 'failed'
}

export interface VerificationDetails {
  success: boolean;
  user_email?: string;
  user?: any;
}

export interface VerificationState {
  stage: VerificationStage;
  isSubmitting: boolean;
  error: string | null;
  scopesError: boolean;
  tokenValidated: boolean;
  scopesValidated: boolean;
  verificationDetails: VerificationDetails | null;
}

export interface ZoomCredentials {
  account_id: string;
  client_id: string;
  client_secret: string;
}
