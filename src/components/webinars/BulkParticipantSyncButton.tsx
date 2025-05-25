
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Download, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ZoomWebinar } from '@/hooks/zoom';

interface BulkParticipantSyncButtonProps {
  webinars: ZoomWebinar[];
  onSyncComplete?: () => void;
}

interface SyncProgress {
  total: number;
  completed: number;
  current?: string;
  results: Array<{
    webinarId: string;
    success: boolean;
    totalRegistrants?: number;
    totalAttendees?: number;
    error?: string;
  }>;
}

export const BulkParticipantSyncButton: React.FC<BulkParticipantSyncButtonProps> = ({
  webinars,
  onSyncComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    total: 0,
    completed: 0,
    results: []
  });

  // Filter webinars that might need participant sync (completed webinars)
  const completedWebinars = webinars.filter(w => 
    w.status === 'ended' || w.status === 'completed'
  );

  const handleBulkSync = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to sync participant data',
        variant: 'destructive'
      });
      return;
    }

    if (completedWebinars.length === 0) {
      toast({
        title: 'No webinars to sync',
        description: 'No completed webinars found that require participant sync',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setSyncProgress({
      total: completedWebinars.length,
      completed: 0,
      results: []
    });

    try {
      console.log(`[BulkParticipantSyncButton] Starting bulk sync for ${completedWebinars.length} webinars`);
      
      const webinarIds = completedWebinars.map(w => w.webinar_id);
      
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: {
          action: 'bulk-sync-participants',
          webinarIds
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      console.log(`[BulkParticipantSyncButton] Bulk sync completed:`, data);
      
      setSyncProgress({
        total: completedWebinars.length,
        completed: completedWebinars.length,
        results: data.results || []
      });
      
      const successful = data.totalSynced || 0;
      const failed = completedWebinars.length - successful;
      
      toast({
        title: 'Bulk participant sync completed',
        description: `Successfully synced ${successful} webinars${failed > 0 ? `, ${failed} failed` : ''}`,
        variant: failed > 0 ? 'destructive' : 'default'
      });
      
      // Call the callback to refresh the data
      if (onSyncComplete) {
        onSyncComplete();
      }
      
    } catch (err) {
      console.error('[BulkParticipantSyncButton] Bulk sync failed:', err);
      
      toast({
        title: 'Bulk sync failed',
        description: err.message || 'Could not perform bulk participant sync',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogClose = () => {
    if (!isLoading) {
      setIsDialogOpen(false);
      setSyncProgress({ total: 0, completed: 0, results: [] });
    }
  };

  const progressPercentage = syncProgress.total > 0 
    ? (syncProgress.completed / syncProgress.total) * 100 
    : 0;

  const successfulSyncs = syncProgress.results.filter(r => r.success).length;
  const failedSyncs = syncProgress.results.filter(r => !r.success).length;

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={() => setIsDialogOpen(true)}
          disabled={completedWebinars.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Bulk Sync Participants ({completedWebinars.length})
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Participant Sync</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            This will perform a complete participant sync for all completed webinars, 
            ensuring all registrant and attendee data is retrieved with full pagination.
          </div>
          
          {!isLoading && syncProgress.results.length === 0 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Webinars to sync:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {completedWebinars.slice(0, 10).map(webinar => (
                    <div key={webinar.webinar_id} className="text-sm">
                      • {webinar.topic}
                    </div>
                  ))}
                  {completedWebinars.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ... and {completedWebinars.length - 10} more
                    </div>
                  )}
                </div>
              </div>
              
              <Button
                onClick={handleBulkSync}
                disabled={isLoading}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Start Bulk Sync ({completedWebinars.length} webinars)
              </Button>
            </div>
          )}
          
          {(isLoading || syncProgress.results.length > 0) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{syncProgress.completed}/{syncProgress.total}</span>
                </div>
                <Progress value={progressPercentage} className="w-full" />
              </div>
              
              {syncProgress.current && (
                <div className="text-sm text-muted-foreground">
                  Currently syncing: {syncProgress.current}
                </div>
              )}
              
              {syncProgress.results.length > 0 && (
                <div className="space-y-2">
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {successfulSyncs} successful
                    </span>
                    {failedSyncs > 0 && (
                      <span className="text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {failedSyncs} failed
                      </span>
                    )}
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                    {syncProgress.results.map(result => (
                      <div 
                        key={result.webinarId} 
                        className={`p-2 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}
                      >
                        <div className="font-medium">
                          {completedWebinars.find(w => w.webinar_id === result.webinarId)?.topic || result.webinarId}
                        </div>
                        {result.success ? (
                          <div className="text-green-700">
                            ✓ {result.totalRegistrants || 0} registrants, {result.totalAttendees || 0} attendees
                          </div>
                        ) : (
                          <div className="text-red-700">
                            ✗ {result.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
