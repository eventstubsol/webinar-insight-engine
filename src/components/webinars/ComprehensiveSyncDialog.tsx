import React, { useState, useEffect } from 'react';
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
import { executeChunkedSync, getEligibleWebinars, ChunkedSyncProgress } from '@/hooks/zoom/operations/chunkedOperations';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<ChunkedSyncProgress | null>(null);
  const [availableWebinars, setAvailableWebinars] = useState<any[]>([]);
  const [selectedWebinars, setSelectedWebinars] = useState<string[]>([]);
  const [step, setStep] = useState<'basic' | 'detailed'>('basic');
  
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

  // Load available webinars when dialog opens
  useEffect(() => {
    if (isOpen && user?.id) {
      loadAvailableWebinars();
    }
  }, [isOpen, user?.id]);

  const loadAvailableWebinars = async () => {
    if (!user?.id) return;
    
    try {
      const webinars = await getEligibleWebinars(user.id);
      setAvailableWebinars(webinars);
      // Select all by default
      setSelectedWebinars(webinars.map(w => w.webinar_id));
    } catch (error) {
      console.error('Failed to load webinars:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available webinars',
        variant: 'destructive'
      });
    }
  };

  const handleBasicSync = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setSyncComplete(false);
    
    try {
      // First do basic comprehensive sync
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: {
          action: 'comprehensive-sync',
          options
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to start basic sync');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Update available webinars from the response
      if (data.availableWebinars) {
        setAvailableWebinars(data.availableWebinars);
        setSelectedWebinars(data.availableWebinars.map((w: any) => w.id));
      }

      toast({
        title: 'Basic Sync Completed',
        description: `Successfully synced ${data.syncResults?.totalWebinars || 0} webinars`,
        variant: 'default'
      });

      // Move to detailed sync step
      setStep('detailed');

    } catch (err: any) {
      console.error('Basic sync error:', err);
      
      toast({
        title: 'Basic Sync Failed',
        description: err.message || 'An unexpected error occurred during basic sync',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetailedSync = async () => {
    if (!user?.id || selectedWebinars.length === 0) return;
    
    setIsLoading(true);
    setSyncComplete(false);
    setCurrentProgress(null);

    // Build list of data types to sync
    const dataTypesToSync = [];
    if (options.includeParticipants) dataTypesToSync.push('participants');
    if (options.includeInstances) dataTypesToSync.push('instances');
    if (options.includeChat) dataTypesToSync.push('chat');
    if (options.includePolls) dataTypesToSync.push('polls');
    if (options.includeQuestions) dataTypesToSync.push('questions');
    if (options.includeRecordings) dataTypesToSync.push('recordings');

    try {
      await executeChunkedSync(user.id, queryClient, {
        dataTypes: dataTypesToSync,
        webinarIds: selectedWebinars,
        chunkSize: options.batchSize,
        onProgress: (progress) => {
          setCurrentProgress(progress);
        }
      });

      setSyncComplete(true);

      if (onSyncComplete) {
        onSyncComplete();
      }

    } catch (err: any) {
      console.error('Detailed sync error:', err);
      
      toast({
        title: 'Detailed Sync Failed',
        description: err.message || 'An unexpected error occurred during detailed sync',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setIsOpen(false);
      setStep('basic');
      setCurrentProgress(null);
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
            {step === 'detailed' && <Badge variant="secondary">Step 2: Detailed Data</Badge>}
          </DialogTitle>
          <DialogDescription>
            {step === 'basic' 
              ? 'First, we\'ll sync your basic webinar data, then you can choose which detailed data to fetch.'
              : 'Select webinars and data types for detailed synchronization.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'basic' && !isLoading && !syncComplete && (
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
                  <p className="font-medium text-blue-800">Two-Step Process</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Step 1: Quick basic webinar sync (30-60 seconds)</li>
                    <li>• Step 2: Detailed data sync in manageable chunks</li>
                    <li>• This prevents timeouts and allows better progress tracking</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleBasicSync} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Start Basic Sync
              </Button>
            </div>
          </div>
        )}

        {step === 'detailed' && !isLoading && !syncComplete && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Webinars for Detailed Sync</h3>
              <p className="text-sm text-muted-foreground">
                Found {availableWebinars.length} completed webinars. Select which ones to sync detailed data for:
              </p>
              
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Checkbox
                    id="select-all"
                    checked={selectedWebinars.length === availableWebinars.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedWebinars(availableWebinars.map(w => w.webinar_id));
                      } else {
                        setSelectedWebinars([]);
                      }
                    }}
                  />
                  <Label htmlFor="select-all" className="font-medium">
                    Select All ({availableWebinars.length} webinars)
                  </Label>
                </div>
                
                {availableWebinars.map((webinar) => (
                  <div key={webinar.webinar_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={webinar.webinar_id}
                      checked={selectedWebinars.includes(webinar.webinar_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedWebinars([...selectedWebinars, webinar.webinar_id]);
                        } else {
                          setSelectedWebinars(selectedWebinars.filter(id => id !== webinar.webinar_id));
                        }
                      }}
                    />
                    <Label htmlFor={webinar.webinar_id} className="text-sm cursor-pointer flex-1">
                      {webinar.topic} ({new Date(webinar.start_time).toLocaleDateString()})
                    </Label>
                  </div>
                ))}
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

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep('basic')}>
                Back
              </Button>
              <Button 
                onClick={handleDetailedSync}
                disabled={selectedWebinars.length === 0 || selectedCount === 0}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Start Detailed Sync ({selectedWebinars.length} webinars)
              </Button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {step === 'basic' ? 'Basic Sync Progress' : 'Detailed Sync Progress'}
                </h3>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  In Progress
                </Badge>
              </div>
              
              {currentProgress ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Syncing {currentProgress.dataType}</span>
                    <span>Chunk {currentProgress.currentChunk}/{currentProgress.totalChunks}</span>
                  </div>
                  <Progress 
                    value={(currentProgress.currentChunk / currentProgress.totalChunks) * 100} 
                    className="h-2" 
                  />
                  <p className="text-sm text-muted-foreground">
                    Processed {currentProgress.processedWebinars}/{currentProgress.totalWebinars} webinars
                    {currentProgress.errors > 0 && (
                      <span className="text-destructive"> ({currentProgress.errors} errors)</span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{step === 'basic' ? 'Fetching basic webinar data...' : 'Starting detailed sync...'}</span>
                  </div>
                  <Progress value={25} className="h-2" />
                </div>
              )}
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Sync in progress</strong> - This may take several minutes. 
                Please keep this dialog open.
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
