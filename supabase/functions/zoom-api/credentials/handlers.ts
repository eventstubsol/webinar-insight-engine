
import { Request } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, createErrorResponse, createSuccessResponse } from '../cors.ts';
import { saveZoomCredentials, getZoomCredentials, updateCredentialsVerification } from './storage.ts';
import { verifyZoomCredentials, testOAuthScopes } from './verification.ts';

// Handler to save Zoom credentials
export async function handleSaveCredentials(req: Request, supabaseAdmin: any, user: any, body: any) {
  try {
    const { account_id, client_id, client_secret } = body;
    
    // Validate input
    if (!account_id || !client_id || !client_secret) {
      return createErrorResponse("Missing required fields: account_id, client_id, client_secret", 400);
    }
    
    // Save credentials (unverified at this point)
    const savedCredentials = await saveZoomCredentials(
      supabaseAdmin,
      user.id,
      { account_id, client_id, client_secret },
      false
    );
    
    return createSuccessResponse({
      message: "Credentials saved successfully, not verified yet",
      credentials: savedCredentials
    });
  } catch (error) {
    console.error("Error saving credentials:", error);
    return createErrorResponse(`Failed to save credentials: ${error.message}`, 400);
  }
}

// Handler to check credentials status
export async function handleCheckCredentialsStatus(req: Request, supabaseAdmin: any, user: any) {
  try {
    const credentials = await getZoomCredentials(supabaseAdmin, user.id);
    
    return createSuccessResponse({
      hasCredentials: !!credentials,
      isVerified: credentials ? credentials.is_verified : false,
      lastVerifiedAt: credentials ? credentials.last_verified_at : null
    });
  } catch (error) {
    console.error("Error checking credentials status:", error);
    return createErrorResponse(`Failed to check credentials status: ${error.message}`, 400);
  }
}

// Handler to get credentials
export async function handleGetCredentials(req: Request, supabaseAdmin: any, user: any) {
  try {
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
    console.error("Error getting credentials:", error);
    return createErrorResponse(`Failed to retrieve credentials: ${error.message}`, 400);
  }
}

// Handler to verify credentials
export async function handleVerifyCredentials(req: Request, supabaseAdmin: any, user: any, credentials: any) {
  try {
    console.log(`Verifying credentials for user ${user.id}`);
    
    // Try to get a token - this will throw if credentials are invalid
    const token = await verifyZoomCredentials(credentials);
    console.log(`Successfully obtained token for user ${user.id}`);
    
    // Test scopes
    const scopeResult = await testOAuthScopes(token);
    console.log(`Scope test passed for user ${user.id}`);
    
    // Update verification status and save the token
    await updateCredentialsVerification(supabaseAdmin, user.id, true, token);
    
    return createSuccessResponse({
      verified: true,
      message: "Credentials verified successfully",
      user: scopeResult.user
    });
  } catch (error) {
    console.error("Error verifying credentials:", error);
    
    // Update verification status to false on failure
    try {
      await updateCredentialsVerification(supabaseAdmin, user.id, false);
    } catch (updateError) {
      console.error("Error updating verification status:", updateError);
    }
    
    // Check for specific error types
    if (error.message?.includes('scopes')) {
      return createErrorResponse(error.message, 403);
    }
    
    return createErrorResponse(`Failed to verify credentials: ${error.message}`, 400);
  }
}
