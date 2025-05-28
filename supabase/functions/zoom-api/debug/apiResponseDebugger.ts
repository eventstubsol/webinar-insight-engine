
import { getZoomJwtToken } from '../auth.ts';

export async function debugZoomAPIResponses(token: string, userId: string) {
  console.log('🔍 === ZOOM API DEBUGGING SESSION ===');
  console.log(`User ID: ${userId}`);
  console.log(`Token: ${token.substring(0, 20)}...`);
  
  // Test 1: Regular webinars endpoint
  console.log('\n📋 === TESTING REGULAR WEBINARS ENDPOINT ===');
  try {
    const regularUrl = `https://api.zoom.us/v2/users/${userId}/webinars?page_size=10`;
    const regularResponse = await fetch(regularUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const regularData = await regularResponse.json();
    console.log('Status:', regularResponse.status);
    console.log('Response keys:', Object.keys(regularData));
    console.log('Webinars count:', regularData.webinars?.length || 0);
    
    if (regularData.webinars?.length > 0) {
      console.log('First webinar structure:', Object.keys(regularData.webinars[0]));
      console.log('Sample webinar:', JSON.stringify(regularData.webinars[0], null, 2));
    }
  } catch (error) {
    console.error('Regular API Error:', error);
  }
  
  // Test 2: Historical/Reporting endpoint
  console.log('\n📊 === TESTING REPORTING ENDPOINT ===');
  try {
    const fromDate = '2024-01-01';
    const toDate = '2024-12-31';
    const reportUrl = `https://api.zoom.us/v2/report/users/${userId}/webinars?from=${fromDate}&to=${toDate}&page_size=10`;
    
    const reportResponse = await fetch(reportUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const reportData = await reportResponse.json();
    console.log('Status:', reportResponse.status);
    console.log('Response keys:', Object.keys(reportData));
    console.log('Webinars count:', reportData.webinars?.length || 0);
    
    if (reportData.webinars?.length > 0) {
      console.log('First historical webinar structure:', Object.keys(reportData.webinars[0]));
      console.log('Sample historical webinar:', JSON.stringify(reportData.webinars[0], null, 2));
    }
  } catch (error) {
    console.error('Reporting API Error:', error);
  }
  
  // Test 3: Account-level webinars
  console.log('\n🏢 === TESTING ACCOUNT WEBINARS ===');
  try {
    const accountUrl = `https://api.zoom.us/v2/accounts/me/webinars?page_size=10`;
    const accountResponse = await fetch(accountUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const accountData = await accountResponse.json();
    console.log('Status:', accountResponse.status);
    console.log('Response keys:', Object.keys(accountData));
    console.log('Webinars count:', accountData.webinars?.length || 0);
    
    if (accountData.webinars?.length > 0) {
      console.log('First account webinar structure:', Object.keys(accountData.webinars[0]));
      console.log('Sample account webinar:', JSON.stringify(accountData.webinars[0], null, 2));
    }
  } catch (error) {
    console.error('Account API Error:', error);
  }
  
  // Test 4: Check user info
  console.log('\n👤 === USER INFO ===');
  try {
    const userUrl = `https://api.zoom.us/v2/users/${userId}`;
    const userResponse = await fetch(userUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const userData = await userResponse.json();
    console.log('User data:', JSON.stringify(userData, null, 2));
  } catch (error) {
    console.error('User API Error:', error);
  }
  
  console.log('\n🏁 === DEBUGGING SESSION COMPLETE ===');
}

// Add this to your main handler for testing
export async function handleDebugAPI(req: Request, supabase: any, user: any, credentials: any) {
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  // Get user info first
  const meResponse = await fetch('https://api.zoom.us/v2/users/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const meData = await meResponse.json();
  
  await debugZoomAPIResponses(token, meData.id);
  
  return new Response(JSON.stringify({ 
    message: 'Debug completed - check server logs',
    userId: meData.id 
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
