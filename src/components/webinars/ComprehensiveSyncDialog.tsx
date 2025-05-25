
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  RefreshCw, 
  Database, 
  Users, 
  MessageSquare, 
  HelpCircle, 
  BarChart3, 
  Video, 
  Play,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ComprehensiveSyncOptions {
  includeParticipants: boolean;
  includeInstances: boolean;
  includeChat: boolean;
  includePolls: boolean;
  includeQuestions: boolean;
  includeRecordings: boolean;
  includeEngagement: boolean;
  batchSize: number;
}

interface SyncProgress {
  stage: string;
  progress: number;
  total: number;
  message: string;
  completed: string[];
  current: string;
}

interface ComprehensiveSyncDialogProps {
  onSyncComplete?: () => void;
  trigger?: React.ReactNode;
}

export const ComprehensiveSyncDialog: React.FC<ComprehensiveSyncDialogProps> = ({
  onSyncComplete,
  trigger
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [syncComplete, setSyncComplete] = useState(false);
  const [options, setOptions] = useState<ComprehensiveSyncOptions>({
    includeParticipants: true,
    includeInstances: true,
    includeChat: true,
    includePolls: true,
    includeQuestions: true,
    includeRecordings: true,
    includeEngagement: false,
    batchSize: 5
  });

  const dataTypeConfig = [
    {
      key: 'includeParticipants',
      label: 'Detailed Participants',
      description: 'Full registrant and attendee lists with contact information',
      icon: Users,
      recommended: true
    },
    {
      key: 'includeInstances',
      label: 'Webinar Instances',
      description: 'Individual occurrences of recurring webinars',
      icon: Database,
      recommended: true
    },
    {
      key: 'includeChat',
      label: 'Chat Messages',
      description: 'All chat messages and conversations during webinars',
      icon: MessageSquare,
      recommended: true
    },
    {
      key: 'includeQuestions',
      label: 'Q&A Sessions',
      description: 'Questions asked and answers provided during webinars',
      icon: HelpCircle,
      recommended: true
    },
    {
      key: 'includePolls',
      label: 'Poll Responses',
      description: 'Poll questions and participant responses',
      icon: BarChart3,
      recommended: true
    },
    {
      key: 'includeRecordings',
      label: 'Recording Information',
      description: 'Recording files, download links, and metadata',
      icon: Video,
      recommended: true
    },
    {
      key: 'includeEngagement',
      label: 'Engagement Analytics',
      description: 'Advanced metrics like attention scores and engagement duration',
      icon: Play,
      recommended: false
    }
  ];

  const handleSync = async () => {
    setIsLoading(true);
    setSyncComplete(false);
    setProgress({
      stage: 'initializing',
      progress: 0,
      total: 100,
      message: 'Starting comprehensive sync...',
      completed: [],
      current: 'Setup'
    });

    try {
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: {
          action: 'comprehensive-sync',
          options
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to start comprehensive sync');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setProgress({
        stage: 'completed',
        progress: 100,
        total: 100,
        message: 'Comprehensive sync completed successfully!',
        completed: ['All data types'],
        current: 'Finished'
      });

      setSyncComplete(true);

      toast({
        title: 'Comprehensive Sync Completed',
        description: `Successfully synced all selected data types. Total webinars: ${data.syncResults?.totalWebinars || 0}`,
        variant: 'default'
      });

      if (onSyncComplete) {
        onSyncComplete();
      }

    } catch (err: any) {
      console.error('Comprehensive sync error:', err);
      
      toast({
        title: 'Comprehensive Sync Failed',
        description: err.message || 'An unexpected error occurred during sync',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setIsOpen(false);
      setProgress(null);
      setSyncComplete(false);
    }
  };

  const selectedCount = Object.values(options).filter(Boolean).length - 1; // Exclude batchSize

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Comprehensive Sync
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Comprehensive Zoom Data Sync
          </DialogTitle>
          <DialogDescription>
            Fetch all available data from Zoom for your webinars. This process may take several minutes depending on the amount of data.
          </DialogDescription>
        </DialogHeader>

        {!isLoading && !syncComplete && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Select Data Types</h3>
                <Badge variant="secondary">
                  {selectedCount} selected
                </Badge>
              </div>
              
              <div className="grid gap-4">
                {dataTypeConfig.map((config) => {
                  const Icon = config.icon;
                  const isChecked = options[config.key as keyof ComprehensiveSyncOptions] as boolean;
                  
                  return (
                    <div key={config.key} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                      <Checkbox
                        id={config.key}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          setOptions(prev => ({
                            ...prev,
                            [config.key]: checked
                          }));
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor={config.key} className="flex items-center gap-2 cursor-pointer">
                          <Icon className="h-4 w-4" />
                          {config.label}
                          {config.recommended && (
                            <Badge variant="secondary" className="text-xs">
                              Recommended
                            </Badge>
                          )}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-medium">Performance Settings</h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="batchSize">Batch Size (webinars processed simultaneously)</Label>
                <select
                  id="batchSize"
                  value={options.batchSize}
                  onChange={(e) => setOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                  className="border rounded px-2 py-1"
                >
                  <option value={1}>1 (Slowest, most reliable)</option>
                  <option value={3}>3 (Balanced)</option>
                  <option value={5}>5 (Recommended)</option>
                  <option value={10}>10 (Fastest, may timeout)</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-blue-800">Important Notes</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• This process may take 5-15 minutes for large datasets</li>
                    <li>• Some data is only available for completed webinars</li>
                    <li>• Existing data will be preserved and updated where applicable</li>
                    <li>• You can continue using the app while sync runs in background</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSync}
                disabled={selectedCount === 0}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Start Comprehensive Sync
              </Button>
            </div>
          </div>
        )}

        {isLoading && progress && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Sync Progress</h3>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  In Progress
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progress.message}</span>
                  <span>{progress.progress}%</span>
                </div>
                <Progress value={progress.progress} className="h-2" />
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Current Stage: {progress.current}</h4>
                
                {progress.completed.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Completed:</p>
                    <div className="flex flex-wrap gap-1">
                      {progress.completed.map((item, index) => (
                        <Badge key={index} variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Please keep this dialog open</strong> while the sync is in progress. 
                You can minimize your browser but don't close this tab.
              </p>
            </div>
          </div>
        )}

        {syncComplete && (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Sync Completed Successfully!</h3>
              <p className="text-muted-foreground">
                All selected data has been synced from Zoom. You can now close this dialog.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
