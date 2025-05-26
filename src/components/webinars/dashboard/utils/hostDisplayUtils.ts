
// Utility functions for formatting host and presenter display information

export interface HostInfo {
  name?: string;
  email: string;
}

/**
 * Extracts host information from webinar raw data with enhanced name resolution
 */
export function extractHostInfo(webinar: any): HostInfo {
  const hostEmail = webinar.host_email;
  
  console.log('[extractHostInfo] Processing webinar data:', {
    host_email: hostEmail,
    raw_data_keys: Object.keys(webinar.raw_data || {}),
    panelists_count: webinar.panelists?.length || 0
  });
  
  // Try multiple sources for host name
  const rawData = webinar.raw_data || {};
  let hostName = null;
  
  // 1. Check direct host name fields in raw_data
  hostName = rawData.host_name || rawData.host?.name;
  
  // 2. Check if host is listed in panelists array
  if (!hostName && Array.isArray(webinar.panelists)) {
    const hostPanelist = webinar.panelists.find((p: any) => 
      p.email === hostEmail || p.user_email === hostEmail
    );
    if (hostPanelist) {
      hostName = hostPanelist.name;
      console.log('[extractHostInfo] Found host name in panelists:', hostName);
    }
  }
  
  // 3. Check contact information
  if (!hostName && rawData.settings?.contact_name) {
    hostName = rawData.settings.contact_name;
  }
  
  // 4. Check alternative host information
  if (!hostName && rawData.alternative_host_ids) {
    // This might contain host info, but we'd need to fetch it separately
    console.log('[extractHostInfo] Alternative host IDs found, but name resolution not implemented');
  }
  
  // 5. Try to extract name from email prefix as last resort
  if (!hostName && hostEmail) {
    const emailPrefix = hostEmail.split('@')[0];
    // Only use email prefix if it looks like a name (contains letters and possibly dots/underscores)
    if (emailPrefix && /^[a-zA-Z][\w.]*$/.test(emailPrefix)) {
      // Convert email prefix to a more readable format (e.g., "john.doe" -> "John Doe")
      hostName = emailPrefix
        .split(/[._]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
      console.log('[extractHostInfo] Using formatted email prefix as name:', hostName);
    }
  }
  
  console.log('[extractHostInfo] Final result:', { name: hostName, email: hostEmail });
  
  return {
    name: hostName,
    email: hostEmail
  };
}

/**
 * Extracts presenter information from webinar data with enhanced name resolution
 */
export function extractPresenterInfo(webinar: any): HostInfo {
  // Start with alternative_host or fall back to host_email
  const presenter = webinar.alternative_host || webinar.host_email;
  
  console.log('[extractPresenterInfo] Processing presenter:', presenter);
  
  // Check if presenter field contains both name and email in format "Name <email@domain.com>"
  const emailMatch = presenter.match(/<(.+)>$/);
  if (emailMatch) {
    const email = emailMatch[1];
    const name = presenter.replace(/<.+>$/, '').trim();
    console.log('[extractPresenterInfo] Extracted from formatted string:', { name, email });
    return { name, email };
  }
  
  // Try to find presenter in panelists or other data
  const rawData = webinar.raw_data || {};
  let presenterName = null;
  let presenterEmail = presenter;
  
  // Check if presenter is in panelists array
  if (Array.isArray(webinar.panelists)) {
    const presenterPanelist = webinar.panelists.find((p: any) => 
      p.email === presenter || p.name === presenter || p.user_email === presenter
    );
    if (presenterPanelist) {
      presenterName = presenterPanelist.name;
      presenterEmail = presenterPanelist.email || presenterPanelist.user_email || presenter;
      console.log('[extractPresenterInfo] Found presenter in panelists:', { name: presenterName, email: presenterEmail });
    }
  }
  
  // If no name found and presenter looks like an email, try to format the email prefix
  if (!presenterName && presenter && presenter.includes('@')) {
    const emailPrefix = presenter.split('@')[0];
    if (emailPrefix && /^[a-zA-Z][\w.]*$/.test(emailPrefix)) {
      presenterName = emailPrefix
        .split(/[._]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
      console.log('[extractPresenterInfo] Using formatted email prefix as name:', presenterName);
    }
  }
  
  // If presenter is not an email and we don't have a separate email, use host_email as fallback
  if (!presenter.includes('@')) {
    presenterEmail = webinar.host_email;
  }
  
  console.log('[extractPresenterInfo] Final result:', { name: presenterName, email: presenterEmail });
  
  return {
    name: presenterName,
    email: presenterEmail
  };
}

/**
 * Formats display text for host/presenter info
 */
export function formatHostDisplay(hostInfo: HostInfo): string {
  if (hostInfo.name && hostInfo.name.trim()) {
    return `${hostInfo.name} (${hostInfo.email})`;
  }
  return hostInfo.email;
}
