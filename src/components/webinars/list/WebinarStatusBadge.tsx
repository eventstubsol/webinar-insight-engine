
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Video, Calendar, CheckCircle, XCircle } from 'lucide-react';

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
};

interface WebinarStatusBadgeProps {
  status: WebinarStatus;
}

export const WebinarStatusBadge: React.FC<WebinarStatusBadgeProps> = ({ status }) => {
  const StatusIcon = status.icon;
  
  return (
    <Badge variant={status.variant} className="flex items-center gap-1">
      {StatusIcon && <StatusIcon className="h-3 w-3" />}
      <span>{status.label}</span>
    </Badge>
  );
};
