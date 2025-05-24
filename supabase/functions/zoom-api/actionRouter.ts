
import { RequestContext } from "./requestHandler.ts";
import { createErrorResponse } from "./cors.ts";
import { executeWithTimeout } from "./timeout.ts";
import { 
  getZoomCredentials,
  verifyZoomCredentials,
  handleSaveCredentials,
  handleCheckCredentialsStatus,
  handleVerifyCredentials 
} from "./credentials.ts";
import { 
  handleListWebinars, 
  handleGetWebinar, 
  handleGetParticipants, 
  handleUpdateWebinarParticipants,
  handleGetWebinarInstances,
  handleGetInstanceParticipants
} from "./webinars.ts";

const OPERATION_TIMEOUT = 25000;

// Route actions that don't require verified Zoom credentials
export async function routeCredentialActions(action: string, context: RequestContext): Promise<Response | null> {
  const { req, supabaseAdmin, user, body } = context;
  
  switch (action) {
    case "save-credentials":
      return await executeWithTimeout(
        () => handleSaveCredentials(req, supabaseAdmin, user, body),
        OPERATION_TIMEOUT
      );
    
    case "check-credentials-status":
      return await executeWithTimeout(
        () => handleCheckCredentialsStatus(req, supabaseAdmin, user),
        OPERATION_TIMEOUT
      );
    
    case "verify-credentials":
      const verifyCredentials = await getZoomCredentials(supabaseAdmin, user.id);
      if (!verifyCredentials) {
        throw new Error("Zoom credentials not found");
      }
      
      return await executeWithTimeout(
        () => handleVerifyCredentials(req, supabaseAdmin, user, verifyCredentials),
        OPERATION_TIMEOUT
      );
      
    default:
      return null; // Action not handled by this router
  }
}

// Route actions that require verified Zoom credentials
export async function routeWebinarActions(action: string, context: RequestContext, credentials: any): Promise<Response> {
  const { req, supabaseAdmin, user, body } = context;
  
  // Verify credentials for actions that require valid credentials
  await verifyZoomCredentials(credentials);
  
  switch (action) {
    case "list-webinars":
      return await executeWithTimeout(
        () => handleListWebinars(req, supabaseAdmin, user, credentials, body.force_sync || false),
        OPERATION_TIMEOUT
      );
      
    case "get-webinar":
      return await executeWithTimeout(
        () => handleGetWebinar(req, supabaseAdmin, user, credentials, body.id),
        OPERATION_TIMEOUT
      );
      
    case "get-participants":
      return await executeWithTimeout(
        () => handleGetParticipants(req, supabaseAdmin, user, credentials, body.id),
        OPERATION_TIMEOUT
      );
      
    case "update-webinar-participants":
      return await executeWithTimeout(
        () => handleUpdateWebinarParticipants(req, supabaseAdmin, user, credentials),
        OPERATION_TIMEOUT
      );
      
    case "get-webinar-instances":
      return await executeWithTimeout(
        () => handleGetWebinarInstances(req, supabaseAdmin, user, credentials, body.webinar_id),
        OPERATION_TIMEOUT
      );
      
    case "get-instance-participants":
      return await executeWithTimeout(
        () => handleGetInstanceParticipants(req, supabaseAdmin, user, credentials, body.webinar_id, body.instance_id),
        OPERATION_TIMEOUT
      );
      
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
