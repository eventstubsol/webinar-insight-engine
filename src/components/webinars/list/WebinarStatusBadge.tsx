
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Video, Calendar, CheckCircle, XCircle, Repeat } from 'lucide-react';

export interface WebinarStatus {
  value: string;
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';
  icon?: React.ElementType;
}

export const statusMap: Record<string, WebinarStatus> = {
  'available': { 
    value: 'available', 
    label: 'Scheduled', 
    variant: 'success',
    icon: Calendar 
  },
  'started': { 
    value: 'started', 
    label: 'Live', 
    variant: 'destructive',
    icon: Video
  },
  'ended': { 
    value: 'ended', 
    label: 'Completed', 
    variant: 'default',
    icon: CheckCircle
  },
  'cancelled': { 
    value: 'cancelled', 
    label: 'Canceled', 
    variant: 'destructive',
    icon: XCircle
  },
  'recurring': { 
    value: 'recurring', 
    label: 'Recurring', 
    variant: 'secondary',
    icon: Repeat
  },
  // Add any other status types that might be missing
  'pending': {
    value: 'pending',
    label: 'Pending',
    variant: 'warning',
    icon: Calendar
  },
};

// Default status if the status doesn't match any in our map
const defaultStatus: WebinarStatus = {
  value: 'unknown',
  label: 'Unknown',
  variant: 'outline',
  icon: Calendar
};

interface WebinarStatusBadgeProps {
  status: WebinarStatus | string;
}

export const WebinarStatusBadge: React.FC<WebinarStatusBadgeProps> = ({ status }) => {
  // If we receive a string instead of a WebinarStatus object, look it up in the map
  let statusObj: WebinarStatus;
  
  if (typeof status === 'string') {
    statusObj = statusMap[status.toLowerCase()] || defaultStatus;
  } else {
    statusObj = status;
  }
  
  const StatusIcon = statusObj.icon;
  
  return (
    <Badge variant={statusObj.variant} className="flex items-center gap-1">
      {StatusIcon && <StatusIcon className="h-3 w-3" />}
      <span>{statusObj.label}</span>
    </Badge>
  );
};
