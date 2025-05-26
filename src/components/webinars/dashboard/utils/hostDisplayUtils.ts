
// Utility functions for formatting host and presenter display information

export interface HostInfo {
  name?: string;
  email: string;
}

/**
 * Extracts host information from webinar raw data
 */
export function extractHostInfo(webinar: any): HostInfo {
  const hostEmail = webinar.host_email;
  
  // Try to get host name from raw_data
  const rawData = webinar.raw_data;
  let hostName = rawData?.host_name || rawData?.host?.name;
  
  // If no name in raw_data, try to extract from other fields
  if (!hostName && rawData?.settings?.contact_name) {
    hostName = rawData.settings.contact_name;
  }
  
  return {
    name: hostName,
    email: hostEmail
  };
}

/**
 * Extracts presenter information from webinar data
 */
export function extractPresenterInfo(webinar: any): HostInfo {
  const presenter = webinar.alternative_host || webinar.host_email;
  
  // Check if presenter field contains both name and email
  const emailMatch = presenter.match(/<(.+)>$/);
  if (emailMatch) {
    // Format: "Name <email@domain.com>"
    const email = emailMatch[1];
    const name = presenter.replace(/<.+>$/, '').trim();
    return { name, email };
  }
  
  // Try to get presenter name from raw_data panelists or alternative hosts
  const rawData = webinar.raw_data;
  if (rawData?.panelists) {
    const presenterPanelist = rawData.panelists.find((p: any) => 
      p.email === presenter || p.name === presenter
    );
    if (presenterPanelist) {
      return {
        name: presenterPanelist.name,
        email: presenterPanelist.email || presenter
      };
    }
  }
  
  // Fallback: assume it's just an email
  return {
    email: presenter
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
