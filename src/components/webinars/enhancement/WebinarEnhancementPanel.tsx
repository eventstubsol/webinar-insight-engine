
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancementStatusBadge } from './EnhancementStatusBadge';
import { EnhancementButton } from './EnhancementButton';
import { useWebinarEnhancement } from '@/hooks/zoom/useWebinarEnhancement';
import {
  EnhancementType,
  getEnhancementState,
  canEnhance,
  isWebinarCompleted,
  getEnhancementLabel
} from '@/hooks/zoom/utils/enhancementUtils';
import { Separator } from '@/components/ui/separator';

interface WebinarEnhancementPanelProps {
  webinar: any;
}

export const WebinarEnhancementPanel: React.FC<WebinarEnhancementPanelProps> = ({
  webinar
}) => {
  const { enhanceWebinar, loadingStates } = useWebinarEnhancement();
  const enhancementState = getEnhancementState(webinar);
  const isCompleted = isWebinarCompleted(webinar);

  const handleEnhance = (type: EnhancementType, webinarId: string) => {
    enhanceWebinar(type, webinarId);
  };

  const enhancementTypes: EnhancementType[] = ['participants', 'host', 'panelists', 'settings', 'recordings'];

  // Filter enhancement types based on webinar status
  const availableEnhancements = enhancementTypes.filter(type => {
    // Participants data is only available for completed webinars
    if (type === 'participants' && !isCompleted) {
      return false;
    }
    return true;
  });

  const hasAnyMissingData = availableEnhancements.some(type => canEnhance(webinar, type));

  if (!hasAnyMissingData) {
    return null; // Don't show panel if all data is loaded and current
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Data Enhancement</CardTitle>
        <p className="text-sm text-muted-foreground">
          Load additional webinar data on demand. Only missing or outdated data is shown.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {availableEnhancements.map((type, index) => {
          const status = enhancementState[type];
          const canEnhanceThis = canEnhance(webinar, type);
          const isLoading = loadingStates[`${webinar.id}-${type}`] || false;

          if (!canEnhanceThis && status !== 'loading') {
            return null; // Don't show if data is current
          }

          return (
            <div key={type}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{getEnhancementLabel(type)}</span>
                  <EnhancementStatusBadge 
                    status={isLoading ? 'loading' : status}
                    size="sm"
                  />
                </div>
                {canEnhanceThis && (
                  <EnhancementButton
                    type={type}
                    webinarId={webinar.id}
                    isLoading={isLoading}
                    onEnhance={handleEnhance}
                    size="sm"
                    variant="outline"
                  />
                )}
              </div>
              {index < availableEnhancements.length - 1 && <Separator className="mt-3" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
