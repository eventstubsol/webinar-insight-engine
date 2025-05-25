
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ZoomWebinar } from '@/hooks/zoom';

interface BulkParticipantSyncButtonProps {
  webinars: ZoomWebinar[];
  onSyncComplete?: () => void;
}

interface WebinarSyncIssue {
  webinar: ZoomWebinar;
  issue: 'missing_attendees' | 'incomplete_attendees' | 'missing_registrants' | 'incomplete_registrants';
  expected: number;
  actual: number;
}

export const BulkParticipantSyncButton: React.FC<BulkParticipantSyncButtonProps> = ({
  webinars,
  onSyncComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentWebinar, setCurrentWebinar] = useState('');
  const [issues, setIssues] = useState<WebinarSyncIssue[]>([]);
  const [syncResults, setSyncResults] = useState<{ success: number; failed: number; }>({ success: 0, failed: 0 });
  
  const analyzeWebinars = async () => {
    setIsAnalyzing(true);
    
    try {
      const foundIssues: WebinarSyncIssue[] = [];
      
      for (const webinar of webinars) {
        const expectedParticipants = webinar.participants_count || 0;
        const expectedRegistrants = webinar.registrants_count || 0;
        
        // Check for participant data in the database
        const { data: participantData } = await supabase
          .from('zoom_webinar_participants')
          .select('participant_type')
          .eq('user_id', user?.id)
          .eq('webinar_id', webinar.id);
          
        const actualAttendees = participantData?.filter(p => p.participant_type === 'attendee').length || 0;
        const actualRegistrants = participantData?.filter(p => p.participant_type === 'registrant').length || 0;
        
        // Only check past webinars (completed ones)
        const isCompleted = webinar.status === 'ended' || 
          (webinar.start_time && new Date(webinar.start_time) < new Date());
          
        if (isCompleted) {
          if (expectedParticipants > 0 && actualAttendees === 0) {
            foundIssues.push({
              webinar,
              issue: 'missing_attendees',
              expected: expectedParticipants,
              actual: actualAttendees
            });
          } else if (expectedParticipants > actualAttendees) {
            foundIssues.push({
              webinar,
              issue: 'incomplete_attendees',
              expected: expectedParticipants,
              actual: actualAttendees
            });
          }
          
          if (expectedRegistrants > 0 && actualRegistrants === 0) {
            foundIssues.push({
              webinar,
              issue: 'missing_registrants',
              expected: expectedRegistrants,
              actual: actualRegistrants
            });
          } else if (expectedRegistrants > actualRegistrants) {
            foundIssues.push({
              webinar,
              issue: 'incomplete_registrants',
              expected: expectedRegistrants,
              actual: actualRegistrants
            });
          }
        }
      }
      
      setIssues(foundIssues);
      
    } catch (error) {
      console.error('[BulkParticipantSyncButton] Analysis failed:', error);
      toast({
        title: 'Analysis failed',
        description: 'Could not analyze webinar data',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleBulkSync = async () => {
    if (!user || issues.length === 0) return;
    
    setSyncing(true);
    setSyncProgress(0);
    setSyncResults({ success: 0, failed: 0 });
    
    // Get unique webinars that need syncing
    const webinarsToSync = Array.from(new Set(issues.map(issue => issue.webinar.id)))
      .map(id => issues.find(issue => issue.webinar.id === id)!.webinar);
    
    let completed = 0;
    let successCount = 0;
    let failedCount = 0;
    
    for (const webinar of webinarsToSync) {
      setCurrentWebinar(webinar.topic);
      
      try {
        console.log(`[BulkParticipantSyncButton] Syncing webinar: ${webinar.id}`);
        
        const { data, error } = await supabase.functions.invoke('zoom-api', {
          body: {
            action: 'get-participants',
            id: webinar.id
          }
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        console.log(`[BulkParticipantSyncButton] Synced webinar ${webinar.id}:`, data);
        successCount++;
        
      } catch (error) {
        console.error(`[BulkParticipantSyncButton] Failed to sync webinar ${webinar.id}:`, error);
        failedCount++;
      }
      
      completed++;
      setSyncProgress((completed / webinarsToSync.length) * 100);
      setSyncResults({ success: successCount, failed: failedCount });
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setSyncing(false);
    setCurrentWebinar('');
    
    toast({
      title: 'Bulk sync completed',
      description: `Successfully synced ${successCount} webinars. ${failedCount > 0 ? `${failedCount} failed.` : ''}`,
      variant: successCount > 0 ? 'default' : 'destructive'
    });
    
    if (onSyncComplete) {
      onSyncComplete();
    }
  };
  
  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && issues.length === 0) {
      analyzeWebinars();
    }
  };
  
  const getIssueDescription = (issue: WebinarSyncIssue) => {
    switch (issue.issue) {
      case 'missing_attendees':
        return `Missing all ${issue.expected} attendees`;
      case 'incomplete_attendees':
        return `Missing ${issue.expected - issue.actual} of ${issue.expected} attendees`;
      case 'missing_registrants':
        return `Missing all ${issue.expected} registrants`;
      case 'incomplete_registrants':
        return `Missing ${issue.expected - issue.actual} of ${issue.expected} registrants`;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Fix Missing Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Participant Data Sync</DialogTitle>
          <DialogDescription>
            Analyze and fix missing or incomplete participant data across all webinars.
          </DialogDescription>
        </DialogHeader>
        
        {isAnalyzing && (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analyzing webinar data...</span>
          </div>
        )}
        
        {!isAnalyzing && issues.length === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All webinar participant data appears to be complete. No issues found.
            </AlertDescription>
          </Alert>
        )}
        
        {!isAnalyzing && issues.length > 0 && !isSyncing && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Found {issues.length} data issues across {Array.from(new Set(issues.map(i => i.webinar.id))).length} webinars.
              </AlertDescription>
            </Alert>
            
            <div className="max-h-60 overflow-y-auto space-y-2">
              {issues.map((issue, index) => (
                <div key={index} className="border rounded p-3 space-y-1">
                  <div className="font-medium text-sm">{issue.webinar.topic}</div>
                  <div className="text-sm text-muted-foreground">
                    {getIssueDescription(issue)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Webinar ID: {issue.webinar.id} • Date: {new Date(issue.webinar.start_time).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {isSyncing && (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Syncing participant data from Zoom. This may take several minutes...
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(syncProgress)}%</span>
              </div>
              <Progress value={syncProgress} />
            </div>
            
            {currentWebinar && (
              <div className="text-sm text-muted-foreground">
                Currently syncing: {currentWebinar}
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span>Successful: {syncResults.success}</span>
              <span>Failed: {syncResults.failed}</span>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSyncing}>
            {isSyncing ? 'Syncing...' : 'Cancel'}
          </Button>
          {!isAnalyzing && issues.length > 0 && !isSyncing && (
            <Button onClick={handleBulkSync} disabled={isSyncing}>
              Sync All Issues
            </Button>
          )}
          {!isAnalyzing && issues.length === 0 && (
            <Button onClick={analyzeWebinars}>
              Re-analyze
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
