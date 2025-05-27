
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { EnhancementStatus } from '@/hooks/zoom/utils/enhancementUtils';

interface EnhancementStatusBadgeProps {
  status: EnhancementStatus;
  label?: string;
  size?: 'sm' | 'default';
}

export const EnhancementStatusBadge: React.FC<EnhancementStatusBadgeProps> = ({
  status,
  label,
  size = 'default'
}) => {
  const getStatusConfig = (status: EnhancementStatus) => {
    switch (status) {
      case 'loaded':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          text: label ? `${label} Loaded` : 'Loaded',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'loading':
        return {
          variant: 'secondary' as const,
          icon: RefreshCw,
          text: label ? `Loading ${label}...` : 'Loading...',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'missing':
        return {
          variant: 'outline' as const,
          icon: AlertCircle,
          text: label ? `${label} Missing` : 'Missing',
          className: 'bg-gray-100 text-gray-600 border-gray-200'
        };
      case 'stale':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          text: label ? `${label} Outdated` : 'Outdated',
          className: 'bg-orange-100 text-orange-800 border-orange-200'
        };
      default:
        return {
          variant: 'outline' as const,
          icon: AlertCircle,
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-600 border-gray-200'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <Badge 
      variant={config.variant}
      className={`inline-flex items-center gap-1 ${config.className} ${
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2 py-1'
      }`}
    >
      <Icon 
        size={iconSize} 
        className={status === 'loading' ? 'animate-spin' : ''}
      />
      {config.text}
    </Badge>
  );
};
