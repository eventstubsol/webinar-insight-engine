
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, RefreshCw } from 'lucide-react';
import { EnhancementType, getEnhancementDescription, getEnhancementLabel } from '@/hooks/zoom/utils/enhancementUtils';

interface EnhancementButtonProps {
  type: EnhancementType;
  webinarId: string;
  isLoading?: boolean;
  onEnhance: (type: EnhancementType, webinarId: string) => void;
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'ghost';
}

export const EnhancementButton: React.FC<EnhancementButtonProps> = ({
  type,
  webinarId,
  isLoading = false,
  onEnhance,
  size = 'sm',
  variant = 'outline'
}) => {
  const handleClick = () => {
    onEnhance(type, webinarId);
  };

  const label = getEnhancementLabel(type);
  const description = getEnhancementDescription(type);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size={size}
          variant={variant}
          onClick={handleClick}
          disabled={isLoading}
          className="gap-1"
        >
          {isLoading ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          {isLoading ? 'Loading...' : `Load ${label}`}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{description}</p>
      </TooltipContent>
    </Tooltip>
  );
};
