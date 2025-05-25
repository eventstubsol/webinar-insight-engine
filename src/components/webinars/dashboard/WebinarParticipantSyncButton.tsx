
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WebinarParticipantSyncButtonProps {
  webinarId: string;
  onSyncComplete?: () => void;
  hasParticipants: boolean;
  participantsCount: number;
  actualParticipants: number;
}

export const WebinarParticipantSyncButton: React.FC<WebinarParticipantSyncButtonProps> = ({
  webinarId,
  onSyncComplete,
  hasParticipants,
  participantsCount,
  actualParticipants
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Determine if sync is needed
  const needsSync = participantsCount > 0 && actualParticipants === 0;
  const hasIncompleteData = participantsCount > actualParticipants;
  
  const handleSync = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to sync participant data',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log(`[WebinarParticipantSyncButton] Syncing participants for webinar: ${webinarId}`);
      
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: {
          action: 'get-participants',
          id: webinarId
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      console.log(`[WebinarParticipantSyncButton] Sync completed for webinar ${webinarId}:`, data);
      
      toast({
        title: 'Participant data synced',
        description: `Successfully synced ${data.attendees?.length || 0} attendees and ${data.registrants?.length || 0} registrants`,
        variant: 'default'
      });
      
      // Call the callback to refresh the data
      if (onSyncComplete) {
        onSyncComplete();
      }
      
    } catch (err) {
      console.error('[WebinarParticipantSyncButton] Sync failed:', err);
      
      toast({
        title: 'Sync failed',
        description: err.message || 'Could not sync participant data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getButtonVariant = () => {
    if (needsSync) return 'destructive';
    if (hasIncompleteData) return 'outline';
    return 'ghost';
  };
  
  const getIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (needsSync) return <AlertCircle className="h-4 w-4" />;
    if (hasIncompleteData) return <RefreshCw className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };
  
  const getTooltipText = () => {
    if (needsSync) {
      return `Missing attendee data: Expected ${participantsCount} but found ${actualParticipants}. Click to sync from Zoom.`;
    }
    if (hasIncompleteData) {
      return `Incomplete data: Expected ${participantsCount} but found ${actualParticipants}. Click to re-sync.`;
    }
    return `Participant data is complete (${actualParticipants} participants synced)`;
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={getButtonVariant()}
            size="sm"
            onClick={handleSync}
            disabled={isLoading}
            className="gap-2"
          >
            {getIcon()}
            {needsSync ? 'Sync Missing Data' : hasIncompleteData ? 'Re-sync Data' : 'Data Complete'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
