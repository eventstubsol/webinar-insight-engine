
import { Request } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, createErrorResponse, createSuccessResponse } from '../cors.ts';
import { saveZoomCredentials, getZoomCredentials, updateCredentialsVerification } from './storage.ts';
import { verifyZoomCredentials, testOAuthScopes, ZoomAPIError, ZoomScopesError, ZoomNetworkError, ZoomAuthenticationError, ZoomRateLimitError } from './verification.ts';

// Handler to save Zoom credentials
export async function handleSaveCredentials(req: Request, supabaseAdmin: any, user: any, body: any) {
  try {
    console.log(`[zoom-api:handlers] Save credentials started for user ${user.id}`);
    const { account_id, client_id, client_secret } = body;
    
    // Validate input
    if (!account_id || !client_id || !client_secret) {
      console.error('[zoom-api:handlers] Missing required fields for save-credentials');
      return createErrorResponse("Missing required fields: account_id, client_id, client_secret", 400);
    }
    
    // Save credentials (unverified at this point)
    const savedCredentials = await saveZoomCredentials(
      supabaseAdmin,
      user.id,
      { account_id, client_id, client_secret },
      false
    );
    
    console.log(`[zoom-api:handlers] Credentials saved successfully for user ${user.id}`);
    return createSuccessResponse({
      success: true,
      message: "Credentials saved successfully. Please verify them next.",
      credentials: savedCredentials
    });
  } catch (error) {
    console.error("[zoom-api:handlers] Error saving credentials:", error);
    
    const status = error instanceof ZoomAPIError ? error.status : 400;
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return createErrorResponse(`Failed to save credentials: ${message}`, status);
  }
}

// Handler to check credentials status
export async function handleCheckCredentialsStatus(req: Request, supabaseAdmin: any, user: any) {
  try {
    console.log(`[zoom-api:handlers] Checking credentials status for user ${user.id}`);
    const credentials = await getZoomCredentials(supabaseAdmin, user.id);
    
    return createSuccessResponse({
      hasCredentials: !!credentials,
      isVerified: credentials ? credentials.is_verified : false,
      lastVerifiedAt: credentials ? credentials.last_verified_at : null
    });
  } catch (error) {
    console.error("[zoom-api:handlers] Error checking credentials status:", error);
    
    const status = error instanceof ZoomAPIError ? error.status : 400;
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return createErrorResponse(`Failed to check credentials status: ${message}`, status);
  }
}

// Handler to get credentials
export async function handleGetCredentials(req: Request, supabaseAdmin: any, user: any) {
  try {
    console.log(`[zoom-api:handlers] Getting credentials for user ${user.id}`);
    const credentials = await getZoomCredentials(supabaseAdmin, user.id);
    
    return createSuccessResponse({
      hasCredentials: !!credentials,
      credentials: credentials ? {
        account_id: credentials.account_id,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        is_verified: credentials.is_verified,
        last_verified_at: credentials.last_verified_at
      } : null
    });
  } catch (error) {
    console.error("[zoom-api:handlers] Error getting credentials:", error);
    
    const status = error instanceof ZoomAPIError ? error.status : 400;
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return createErrorResponse(`Failed to retrieve credentials: ${message}`, status);
  }
}

// Handler to verify credentials
export async function handleVerifyCredentials(req: Request, supabaseAdmin: any, user: any, credentials: any) {
  try {
    console.log(`[zoom-api:handlers] Verifying credentials for user ${user.id}`);
    
    if (!credentials) {
      console.error(`[zoom-api:handlers] No credentials found for user ${user.id} during verification`);
      return createErrorResponse("Credentials not found. Please save credentials first.", 404);
    }
    
    // Try to get a token - this will throw if credentials are invalid
    console.log(`[zoom-api:handlers] Attempting to get token for user ${user.id}`);
    const token = await verifyZoomCredentials(credentials);
    console.log(`[zoom-api:handlers] Successfully obtained token for user ${user.id}`);
    
    // Test scopes
    console.log(`[zoom-api:handlers] Testing OAuth scopes for user ${user.id}`);
    const scopeResult = await testOAuthScopes(token);
    console.log(`[zoom-api:handlers] Scope test passed for user ${user.id}`);
    
    // Update verification status and save the token
    await updateCredentialsVerification(supabaseAdmin, user.id, true, token);
    console.log(`[zoom-api:handlers] Updated verification status to true for user ${user.id}`);
    
    return createSuccessResponse({
      success: true,
      verified: true,
      message: "Credentials verified successfully",
      user: scopeResult.user,
      user_email: scopeResult.user?.email
    });
  } catch (error) {
    console.error("[zoom-api:handlers] Error verifying credentials:", error);
    
    // Update verification status to false on failure
    try {
      await updateCredentialsVerification(supabaseAdmin, user.id, false);
      console.log(`[zoom-api:handlers] Updated verification status to false for user ${user.id} after error`);
    } catch (updateError) {
      console.error("[zoom-api:handlers] Error updating verification status:", updateError);
    }
    
    // Handle different error types with appropriate responses
    if (error instanceof ZoomScopesError) {
      return createErrorResponse(error.message, error.status, {
        'X-Error-Type': 'missing_scopes',
        'X-Error-Code': '4711'
      });
    }
    
    if (error instanceof ZoomNetworkError) {
      return createErrorResponse(`Network error: ${error.message}`, error.status);
    }
    
    if (error instanceof ZoomAuthenticationError) {
      return createErrorResponse(`Authentication error: ${error.message}`, error.status);
    }
    
    if (error instanceof ZoomRateLimitError) {
      return createErrorResponse(`Rate limit exceeded: ${error.message}`, error.status);
    }
    
    if (error instanceof ZoomAPIError) {
      return createErrorResponse(`Zoom API error: ${error.message}`, error.status);
    }
    
    // Generic error response
    return createErrorResponse(`Verification failed: ${error.message || 'Unknown error'}`, 400);
  }
}
