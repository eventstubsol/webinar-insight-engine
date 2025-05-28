
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings, Loader2 } from 'lucide-react';
import { useInstanceEnhancement } from '@/hooks/zoom/useInstanceEnhancement';

interface InstanceEnhancementButtonProps {
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  className?: string;
}

export const InstanceEnhancementButton: React.FC<InstanceEnhancementButtonProps> = ({
  size = 'sm',
  variant = 'outline',
  className
}) => {
  const { enhanceHybrid, isEnhancing, lastResult } = useInstanceEnhancement();

  const handleEnhance = () => {
    enhanceHybrid();
  };

  const getTooltipContent = () => {
    if (lastResult?.summary) {
      return `Last enhancement: ${lastResult.summary.enhanced_instances} instances enhanced, ${lastResult.summary.data_completeness}% data complete`;
    }
    return 'Enhance webinar instances with missing data from database';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size}
          onClick={handleEnhance}
          disabled={isEnhancing}
          className={`gap-1 ${className}`}
        >
          {isEnhancing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Settings className="h-4 w-4" />
          )}
          {size !== 'icon' && (isEnhancing ? 'Enhancing...' : 'Enhance Data')}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipContent()}</p>
      </TooltipContent>
    </Tooltip>
  );
};
