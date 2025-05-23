
import { getZoomJwtToken, ZoomApiClient, clearTokenCache } from '../auth/index.ts';
import { parseError } from '../errorHandling.ts';
import { updateCredentialsVerification } from './storage.ts';

/**
 * Verify Zoom credentials by getting a token and checking permissions
 */
export async function verifyZoomCredentials(supabase: any, userId: string, credentials: any) {
  console.log(`Verifying Zoom credentials for user ${userId}`);
  
  try {
    // Step 1: Get an access token
    const tokenResult = await getZoomJwtToken(
      credentials.account_id,
      credentials.client_id,
      credentials.client_secret
    );
    
    if (!tokenResult || !tokenResult.access_token) {
      return {
        success: false,
        message: "Failed to obtain access token from Zoom"
      };
    }
    
    // Step 2: Test OAuth scopes
    const scopeResult = await testOAuthScopes(tokenResult.access_token);
    
    if (!scopeResult.success) {
      return {
        success: false,
        message: scopeResult.error || "Failed to verify OAuth scopes",
        details: scopeResult.details || null
      };
    }
    
    // Step 3: Update credentials verification status
    const updateResult = await updateCredentialsVerification(
      supabase,
      userId,
      true, // verified
      tokenResult.access_token,
      tokenResult.expires_in
    );
    
    return {
      success: true,
      verified: true,
      user_id: userId,
      user: scopeResult.user,
      user_email: scopeResult.user?.email
    };
  } catch (error) {
    console.error("Error verifying credentials:", error);
    const parsedError = parseError(error);
    
    return {
      success: false,
      message: parsedError.message,
      error_code: parsedError.code,
      error_category: parsedError.category
    };
  }
}

/**
 * Test whether the token has necessary OAuth scopes
 */
export async function testOAuthScopes(accessToken: string) {
  try {
    console.log("Testing OAuth scopes with Zoom API");
    
    // Create API client with token
    const zoomClient = new ZoomApiClient(accessToken);
    
    // Try to access user information as a basic test
    const userResponse = await zoomClient.get("/users/me");
    
    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error("User API returned error:", errorData);
      
      return {
        success: false,
        error: `Failed to access Zoom user profile: ${errorData.message || userResponse.statusText}`,
        status: userResponse.status
      };
    }
    
    const userData = await userResponse.json();
    
    // Test webinar access
    const webinarResponse = await zoomClient.get("/users/me/webinars?page_size=1");
    
    if (!webinarResponse.ok) {
      // Check specific error codes for scope issues
      const errorData = await webinarResponse.json();
      
      if (webinarResponse.status === 403 || 
          (errorData.code === 200 && errorData.message?.includes("scope"))) {
        return {
          success: false,
          error: "Missing required OAuth scopes for webinar access",
          details: {
            scopes_missing: ["webinar:read:admin", "webinar:read"],
            scopes_required: ["webinar:read:admin", "webinar:read"]
          },
          status: 403
        };
      }
      
      // Other API errors
      return {
        success: false,
        error: `Failed to access webinars: ${errorData.message}`,
        status: webinarResponse.status
      };
    }
    
    // All checks passed
    return {
      success: true,
      user: userData
    };
  } catch (error) {
    console.error("Error testing OAuth scopes:", error);
    return {
      success: false,
      error: `Failed to test OAuth scopes: ${error.message}`
    };
  }
}

/**
 * Just validate the token without checking scopes
 */
export async function validateTokenOnly(credentials: any) {
  try {
    console.log("Validating token only");
    
    // Clear any cached token first
    clearTokenCache(credentials.account_id, credentials.client_id);
    
    // Try to get a fresh token
    const tokenResult = await getZoomJwtToken(
      credentials.account_id,
      credentials.client_id,
      credentials.client_secret
    );
    
    if (!tokenResult || !tokenResult.access_token) {
      return {
        success: false,
        message: "Failed to obtain access token from Zoom"
      };
    }
    
    return {
      success: true,
      token: tokenResult.access_token,
      expires_in: tokenResult.expires_in
    };
  } catch (error) {
    console.error("Error validating token:", error);
    const parsedError = parseError(error);
    
    return {
      success: false,
      message: parsedError.message,
      error_code: parsedError.code,
      error_category: parsedError.category
    };
  }
}

/**
 * Refresh the token for the provided credentials
 */
export async function refreshZoomToken(credentials: any) {
  try {
    console.log("Refreshing Zoom token");
    
    if (!credentials || !credentials.account_id || !credentials.client_id || !credentials.client_secret) {
      throw new Error("Missing required credentials for token refresh");
    }
    
    // Clear any cached token first
    clearTokenCache(credentials.account_id, credentials.client_id);
    
    // Request a fresh token
    const tokenResult = await getZoomJwtToken(
      credentials.account_id,
      credentials.client_id,
      credentials.client_secret
    );
    
    if (!tokenResult || !tokenResult.access_token) {
      throw new Error("Failed to obtain fresh access token from Zoom");
    }
    
    return {
      success: true,
      token: tokenResult.access_token,
      expires_in: tokenResult.expires_in
    };
  } catch (error) {
    console.error("Token refresh failed:", error);
    throw error; // Re-throw to let caller handle specific errors
  }
}
