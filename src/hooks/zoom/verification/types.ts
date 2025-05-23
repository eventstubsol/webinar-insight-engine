
// Types for the verification flow process
export enum VerificationStage {
  Idle = 'idle',
  INPUT = 'input',
  TOKEN_VALIDATION = 'validating_token',
  SCOPE_VALIDATION = 'validating_scopes',
  SCOPE_ERROR = 'scope_error',
  SAVING = 'saving_credentials',
  Complete = 'complete',
  COMPLETED = 'complete',
  Failed = 'failed',
}

export interface VerificationDetails {
  user?: any;
  user_email?: string;
  verified?: boolean;
  scopes?: string[];
  success?: boolean;
}

export interface VerificationState {
  stage: VerificationStage;
  isSubmitting: boolean;
  error: string | null;
  scopesError: boolean;
  tokenValidated: boolean;
  scopesValidated: boolean;
  verificationDetails: VerificationDetails | null;
  details?: VerificationDetails | null;
}

export interface ZoomCredentials {
  account_id: string;
  client_id: string;
  client_secret: string;
}
