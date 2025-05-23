
// CORS headers for all requests
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Handle CORS preflight requests
export async function handleCors(req: Request) {
  // Always respond to OPTIONS requests with a 204 No Content
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { 
      status: 204, // No content
      headers: corsHeaders 
    });
  }
  return null;
}

// Helper to ensure all responses include CORS headers
export function addCorsHeaders(response: Response): Response {
  // Create new headers merging the original headers with CORS headers
  const newHeaders = new Headers(response.headers);
  
  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  // Create a new response with the merged headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

// Helper to create error responses with CORS headers
export function createErrorResponse(message: string, status: number = 400, additionalHeaders: Record<string, string> = {}): Response {
  console.error(`Error response (${status}): ${message}`);
  
  // Combine CORS headers with any additional headers
  const headers = { ...corsHeaders, 'Content-Type': 'application/json', ...additionalHeaders };
  
  return new Response(
    JSON.stringify({ 
      error: message 
    }),
    {
      status: status,
      headers: headers
    }
  );
}

// Helper to create success responses with CORS headers
export function createSuccessResponse(data: any, status: number = 200, additionalHeaders: Record<string, string> = {}): Response {
  // Combine CORS headers with any additional headers
  const headers = { ...corsHeaders, 'Content-Type': 'application/json', ...additionalHeaders };
  
  return new Response(
    JSON.stringify(data),
    {
      status: status,
      headers: headers
    }
  );
}
