// Utility functions for formatting host and presenter display information

export interface HostInfo {
  name?: string;
  email: string;
}

/**
 * Enhanced name formatting for organizational emails
 */
function formatOrganizationalName(emailPrefix: string): string {
  // Handle common organizational patterns
  const organizationalPatterns: Record<string, string> = {
    'coeinfo': 'Center of Excellence Info',
    'info': 'Information',
    'admin': 'Administrator',
    'support': 'Support Team',
    'marketing': 'Marketing Team',
    'sales': 'Sales Team',
    'webinar': 'Webinar Team',
    'events': 'Events Team',
    'training': 'Training Team',
    'education': 'Education Team',
    'hr': 'Human Resources',
    'it': 'IT Department',
    'finance': 'Finance Department'
  };

  // Check if it matches a known organizational pattern
  const lowerPrefix = emailPrefix.toLowerCase();
  if (organizationalPatterns[lowerPrefix]) {
    return organizationalPatterns[lowerPrefix];
  }

  // Handle patterns like "johnsmith" or "john.smith" or "john_smith"
  const parts = emailPrefix.split(/[._-]/);
  
  // If it's a single word, check if it might be a concatenated name
  if (parts.length === 1 && emailPrefix.length > 3) {
    // Try to split on capital letters (camelCase)
    const camelCaseParts = emailPrefix.split(/(?=[A-Z])/);
    if (camelCaseParts.length > 1) {
      return camelCaseParts
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    }
  }

  // Standard formatting for multiple parts
  return parts
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Enhanced function to extract host information from webinar data
 * Now prioritizes database-stored host name fields over email formatting
 */
export function extractHostInfo(webinar: any): HostInfo {
  const hostEmail = webinar.host_email;
  
  console.log('[extractHostInfo] Processing webinar data:', {
    host_email: hostEmail,
    host_id: webinar.host_id,
    host_name: webinar.host_name,
    host_first_name: webinar.host_first_name,
    host_last_name: webinar.host_last_name,
    raw_data_keys: Object.keys(webinar.raw_data || {}),
    panelists_count: webinar.panelists?.length || 0
  });
  
  const rawData = webinar.raw_data || {};
  let hostName = null;
  
  // 1. Check database-stored host name fields first (highest priority)
  if (webinar.host_name && webinar.host_name.trim()) {
    hostName = webinar.host_name.trim();
    console.log('[extractHostInfo] Using database host_name field:', hostName);
  } else if (webinar.host_first_name || webinar.host_last_name) {
    // Combine first and last name if available
    const firstName = webinar.host_first_name?.trim() || '';
    const lastName = webinar.host_last_name?.trim() || '';
    hostName = `${firstName} ${lastName}`.trim();
    if (hostName) {
      console.log('[extractHostInfo] Using database host name fields (first + last):', hostName);
    }
  }
  
  // 2. Check raw_data host_info if database fields are empty
  if (!hostName && rawData.host_info) {
    if (rawData.host_info.display_name) {
      hostName = rawData.host_info.display_name.trim();
      console.log('[extractHostInfo] Using raw_data host_info display_name:', hostName);
    } else if (rawData.host_info.first_name || rawData.host_info.last_name) {
      const firstName = rawData.host_info.first_name?.trim() || '';
      const lastName = rawData.host_info.last_name?.trim() || '';
      hostName = `${firstName} ${lastName}`.trim();
      if (hostName) {
        console.log('[extractHostInfo] Using raw_data host_info name fields:', hostName);
      }
    }
  }
  
  // 3. Fall back to existing logic for legacy data
  if (!hostName) {
    // Check direct host name fields in raw_data and webinar object
    hostName = rawData.host_name || 
               rawData.host?.name || 
               webinar.host_name ||
               rawData.settings?.contact_name ||
               webinar.contact_name;
    
    // Check if host is listed in panelists array
    if (!hostName && Array.isArray(webinar.panelists) && webinar.panelists.length > 0) {
      const hostPanelist = webinar.panelists.find((p: any) => 
        p.email === hostEmail || 
        p.user_email === hostEmail ||
        p.id === webinar.host_id
      );
      if (hostPanelist) {
        hostName = hostPanelist.name || hostPanelist.first_name || hostPanelist.display_name;
        console.log('[extractHostInfo] Found host name in panelists:', hostName);
      }
    }
    
    // 4. Check alternative host information
    if (!hostName && rawData.alternative_host) {
      // Check if alternative_host contains name information
      if (typeof rawData.alternative_host === 'string' && rawData.alternative_host.includes('<')) {
        const nameMatch = rawData.alternative_host.match(/^(.+)\s*<.+>$/);
        if (nameMatch) {
          hostName = nameMatch[1].trim();
          console.log('[extractHostInfo] Found host name in alternative_host:', hostName);
        }
      }
    }
    
    // 5. Check settings and other nested objects for any name information
    if (!hostName && rawData.settings) {
      hostName = rawData.settings.host_name || 
                 rawData.settings.contact_name ||
                 rawData.settings.alternative_host_name;
    }
    
    // 6. Check webinar level contact information
    if (!hostName && (webinar.contact_name || rawData.contact_name)) {
      hostName = webinar.contact_name || rawData.contact_name;
    }
    
    // Enhanced email prefix formatting as last resort
    if (!hostName && hostEmail) {
      const emailPrefix = hostEmail.split('@')[0];
      if (emailPrefix && /^[a-zA-Z][\w._-]*$/.test(emailPrefix)) {
        hostName = formatOrganizationalName(emailPrefix);
        console.log('[extractHostInfo] Using enhanced formatted email prefix as name:', hostName);
      }
    }
  }
  
  console.log('[extractHostInfo] Final result:', { name: hostName, email: hostEmail });
  
  return {
    name: hostName,
    email: hostEmail
  };
}

/**
 * Enhanced function to extract presenter information from webinar data
 */
export function extractPresenterInfo(webinar: any): HostInfo {
  console.log('[extractPresenterInfo] Processing webinar data:', {
    alternative_host: webinar.alternative_host,
    host_email: webinar.host_email,
    panelists_count: webinar.panelists?.length || 0
  });
  
  const rawData = webinar.raw_data || {};
  let presenterName = null;
  let presenterEmail = null;
  
  // 1. Check alternative_host field first
  const alternativeHost = webinar.alternative_host || rawData.alternative_host;
  
  if (alternativeHost) {
    // Check if alternative_host contains both name and email in format "Name <email@domain.com>"
    const emailMatch = alternativeHost.match(/^(.+)\s*<(.+)>$/);
    if (emailMatch) {
      presenterName = emailMatch[1].trim();
      presenterEmail = emailMatch[2].trim();
      console.log('[extractPresenterInfo] Extracted from formatted alternative_host:', { name: presenterName, email: presenterEmail });
      return { name: presenterName, email: presenterEmail };
    }
    
    // If alternative_host is just an email, use it as email
    if (alternativeHost.includes('@')) {
      presenterEmail = alternativeHost;
    } else {
      // If it's not an email, it might be a name or ID, try to find in panelists
      presenterName = alternativeHost;
    }
  }
  
  // 2. Try to find presenter in panelists array
  if (Array.isArray(webinar.panelists) && webinar.panelists.length > 0) {
    let presenterPanelist = null;
    
    // First try to match by email if we have one
    if (presenterEmail) {
      presenterPanelist = webinar.panelists.find((p: any) => 
        p.email === presenterEmail || p.user_email === presenterEmail
      );
    }
    
    // If no email match and we have a name, try to match by name
    if (!presenterPanelist && presenterName) {
      presenterPanelist = webinar.panelists.find((p: any) => 
        p.name === presenterName || 
        p.display_name === presenterName ||
        p.first_name === presenterName
      );
    }
    
    // If still no match, use the first panelist as likely presenter
    if (!presenterPanelist && webinar.panelists.length > 0) {
      presenterPanelist = webinar.panelists[0];
      console.log('[extractPresenterInfo] Using first panelist as presenter');
    }
    
    if (presenterPanelist) {
      presenterName = presenterPanelist.name || 
                     presenterPanelist.display_name || 
                     presenterPanelist.first_name ||
                     presenterName;
      presenterEmail = presenterPanelist.email || 
                      presenterPanelist.user_email || 
                      presenterEmail;
      console.log('[extractPresenterInfo] Found presenter in panelists:', { name: presenterName, email: presenterEmail });
    }
  }
  
  // 3. Fallback to host information if no presenter found
  if (!presenterName && !presenterEmail) {
    console.log('[extractPresenterInfo] No presenter found, falling back to host');
    return extractHostInfo(webinar);
  }
  
  // 4. If we have email but no name, try to format the email prefix
  if (!presenterName && presenterEmail && presenterEmail.includes('@')) {
    const emailPrefix = presenterEmail.split('@')[0];
    if (emailPrefix && /^[a-zA-Z][\w._-]*$/.test(emailPrefix)) {
      presenterName = formatOrganizationalName(emailPrefix);
      console.log('[extractPresenterInfo] Using formatted email prefix as name:', presenterName);
    }
  }
  
  // 5. Final fallback to host email if no presenter email
  if (!presenterEmail) {
    presenterEmail = webinar.host_email;
  }
  
  console.log('[extractPresenterInfo] Final result:', { name: presenterName, email: presenterEmail });
  
  return {
    name: presenterName,
    email: presenterEmail || webinar.host_email
  };
}

/**
 * Formats display text for host/presenter info with enhanced name display
 */
export function formatHostDisplay(hostInfo: HostInfo): string {
  if (hostInfo.name && hostInfo.name.trim()) {
    return `${hostInfo.name} (${hostInfo.email})`;
  }
  return hostInfo.email;
}
