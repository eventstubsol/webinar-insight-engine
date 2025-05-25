
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Loader2, AlertCircle, CheckCircle, Download } from 'lucide-react';
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
  const [syncProgress, setSyncProgress] = useState<{
    registrants?: number;
    attendees?: number;
    pages?: number;
  }>({});
  
  // Determine if sync is needed
  const needsSync = participantsCount > 0 && actualParticipants === 0;
  const hasIncompleteData = participantsCount > actualParticipants;
  const dataMismatch = participantsCount > 0 && actualParticipants > 0 && 
    Math.abs(participantsCount - actualParticipants) > participantsCount * 0.1; // 10% threshold
  
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
    setSyncProgress({});
    
    try {
      console.log(`[WebinarParticipantSyncButton] Starting complete sync for webinar: ${webinarId}`);
      
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: {
          action: 'sync-webinar-participants',
          id: webinarId
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      console.log(`[WebinarParticipantSyncButton] Sync completed for webinar ${webinarId}:`, data);
      
      setSyncProgress({
        registrants: data.totalRegistrants || 0,
        attendees: data.totalAttendees || 0,
        pages: data.pagesProcessed || 0
      });
      
      toast({
        title: 'Complete participant sync successful',
        description: `Synced ${data.totalRegistrants || 0} registrants and ${data.totalAttendees || 0} attendees across ${data.pagesProcessed || 0} API pages`,
        variant: 'default'
      });
      
      // Call the callback to refresh the data
      if (onSyncComplete) {
        onSyncComplete();
      }
      
    } catch (err) {
      console.error('[WebinarParticipantSyncButton] Complete sync failed:', err);
      
      toast({
        title: 'Complete sync failed',
        description: err.message || 'Could not perform complete participant sync',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getButtonVariant = () => {
    if (needsSync) return 'destructive';
    if (hasIncompleteData || dataMismatch) return 'outline';
    return 'ghost';
  };
  
  const getIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (needsSync) return <AlertCircle className="h-4 w-4" />;
    if (hasIncompleteData || dataMismatch) return <Download className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };
  
  const getButtonText = () => {
    if (isLoading) {
      if (syncProgress.pages) {
        return `Syncing... (${syncProgress.pages} pages)`;
      }
      return 'Syncing...';
    }
    if (needsSync) return 'Sync Missing Data';
    if (dataMismatch) return 'Fix Data Mismatch';
    if (hasIncompleteData) return 'Complete Sync';
    return 'Data Complete';
  };
  
  const getTooltipText = () => {
    if (needsSync) {
      return `Missing participant data: Expected ${participantsCount} but found ${actualParticipants}. Click to perform complete sync with pagination.`;
    }
    if (dataMismatch) {
      return `Data mismatch detected: Expected ${participantsCount} but found ${actualParticipants}. Click to perform complete re-sync.`;
    }
    if (hasIncompleteData) {
      return `Incomplete data: Expected ${participantsCount} but found ${actualParticipants}. Click to complete sync with full pagination.`;
    }
    
    let tooltipText = `Participant data is complete (${actualParticipants} participants synced)`;
    if (syncProgress.registrants !== undefined || syncProgress.attendees !== undefined) {
      tooltipText += `\nLast sync: ${syncProgress.registrants || 0} registrants, ${syncProgress.attendees || 0} attendees`;
      if (syncProgress.pages) {
        tooltipText += ` (${syncProgress.pages} API pages)`;
      }
    }
    return tooltipText;
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
            {getButtonText()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="whitespace-pre-line">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
