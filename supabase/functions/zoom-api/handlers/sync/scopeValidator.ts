
/**
 * OAuth scope validator to ensure proper permissions for historical data access
 */

export interface ScopeValidationResult {
  hasRequiredScopes: boolean;
  missingScopes: string[];
  hasHistoricalAccess: boolean;
  hasReportingAccess: boolean;
  recommendations: string[];
}

/**
 * Validate OAuth scopes for historical webinar data access
 */
export async function validateZoomScopes(token: string): Promise<ScopeValidationResult> {
  console.log('[scope-validator] 🔐 Validating OAuth scopes for historical data access');
  
  const result: ScopeValidationResult = {
    hasRequiredScopes: false,
    missingScopes: [],
    hasHistoricalAccess: false,
    hasReportingAccess: false,
    recommendations: []
  };
  
  try {
    // Test reporting API access (required for historical data)
    const reportingTestUrl = 'https://api.zoom.us/v2/report/users/me';
    const reportingResponse = await fetch(reportingTestUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[scope-validator] Reporting API test status: ${reportingResponse.status}`);
    
    if (reportingResponse.ok) {
      result.hasReportingAccess = true;
      console.log('[scope-validator] ✅ Reporting API access confirmed');
    } else if (reportingResponse.status === 403) {
      result.missingScopes.push('report:read:admin');
      result.recommendations.push('Add "report:read:admin" scope to access historical webinar data');
      console.log('[scope-validator] ❌ Missing report:read:admin scope');
    }
    
    // Test webinar API access
    const webinarTestUrl = 'https://api.zoom.us/v2/users/me/webinars?page_size=1';
    const webinarResponse = await fetch(webinarTestUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[scope-validator] Webinar API test status: ${webinarResponse.status}`);
    
    if (webinarResponse.ok) {
      result.hasHistoricalAccess = true;
      console.log('[scope-validator] ✅ Webinar API access confirmed');
    } else if (webinarResponse.status === 403) {
      result.missingScopes.push('webinar:read:admin');
      result.recommendations.push('Add "webinar:read:admin" scope to access webinar data');
      console.log('[scope-validator] ❌ Missing webinar:read:admin scope');
    }
    
    // Overall validation
    result.hasRequiredScopes = result.hasReportingAccess && result.hasHistoricalAccess;
    
    if (result.hasRequiredScopes) {
      console.log('[scope-validator] ✅ All required scopes validated');
    } else {
      console.log(`[scope-validator] ❌ Missing scopes: ${result.missingScopes.join(', ')}`);
    }
    
  } catch (error) {
    console.error('[scope-validator] ❌ Error validating scopes:', error);
    result.recommendations.push('Check network connectivity and token validity');
  }
  
  return result;
}
