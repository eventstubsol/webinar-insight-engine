
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarDashboardHeader } from '@/components/webinars/dashboard/WebinarDashboardHeader';
import { WebinarMetadataHeader } from '@/components/webinars/dashboard/WebinarMetadataHeader';
import { WebinarDashboardTabs } from '@/components/webinars/dashboard/WebinarDashboardTabs';
import { WebinarDashboardSkeleton } from '@/components/webinars/dashboard/WebinarDashboardSkeleton';
import { 
  useZoomWebinarDetails, 
  useZoomWebinarParticipants, 
  useZoomWebinarInstances,
  ZoomParticipants 
} from '@/hooks/zoom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ZoomDataService } from '@/hooks/zoom/services/ZoomDataService';

// Define helper function to type check and safely cast participants
const safeParticipantsCast = (participants: any): ZoomParticipants => {
  return {
    registrants: Array.isArray(participants.registrants) 
      ? participants.registrants.map((r: any) => ({
          id: r.id || '',
          email: r.email || '',
          first_name: r.first_name || '',
          last_name: r.last_name || '',
          create_time: r.create_time || '',
          join_url: r.join_url || '',
          status: r.status || ''
        }))
      : [],
    attendees: Array.isArray(participants.attendees) 
      ? participants.attendees.map((a: any) => ({
          id: a.id || '',
          name: a.name || '',
          user_email: a.user_email || '',
          join_time: a.join_time || '',
          leave_time: a.leave_time || '',
          duration: Number(a.duration || 0)
        }))
      : []
  };
};

const WebinarDashboard = () => {
  const { webinarId } = useParams<{ webinarId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    webinar, 
    isLoading: isWebinarLoading,
    error: webinarError,
    refetch: refetchWebinar
  } = useZoomWebinarDetails(webinarId || null);
  
  const { 
    participants: rawParticipants, 
    isLoading: isParticipantsLoading,
    isRefetching: isParticipantsRefetching,
    error: participantsError,
    refetch: refetchParticipants 
  } = useZoomWebinarParticipants(webinarId || null);

  const {
    instances,
    isLoading: isInstancesLoading,
    isRefetching: isInstancesRefetching,
    error: instancesError,
    refetch: refetchInstances
  } = useZoomWebinarInstances(webinarId);
  
  const isLoading = isWebinarLoading || isParticipantsLoading || isInstancesLoading;
  const isRefetching = isParticipantsRefetching || isInstancesRefetching;
  
  // Safely cast participants to the expected ZoomParticipants type
  const participants: ZoomParticipants = safeParticipantsCast(rawParticipants);

  // If webinar doesn't exist and loading is complete, redirect to webinars list
  useEffect(() => {
    if (!isLoading && !webinar && webinarId) {
      navigate('/webinars');
    }
  }, [webinar, isLoading, navigate, webinarId]);

  // Function to refresh all data
  const refreshAllData = async () => {
    try {
      toast({
        title: "Refreshing webinar data",
        description: "Please wait while we fetch the latest data..."
      });
      
      await Promise.all([
        refetchWebinar(),
        refetchParticipants(),
        refetchInstances()
      ]);
      
      toast({
        title: "Data refreshed",
        description: "Webinar data has been updated successfully"
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Could not refresh webinar data. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Function to sync all extended data
  const syncAllExtendedData = async () => {
    if (!webinarId) return;
    
    try {
      toast({
        title: "Syncing extended data",
        description: "Please wait while we fetch Q&A, polls, and engagement data..."
      });
      
      const result = await ZoomDataService.syncAllWebinarData(
        webinar?.user_id || '', 
        webinarId
      );
      
      await refreshAllData();
      
      toast({
        title: "Extended data synced",
        description: "Q&A, polls, and engagement data has been updated"
      });
      
      return result;
    } catch (error) {
      console.error("Error syncing extended data:", error);
      toast({
        title: "Sync failed",
        description: "Could not sync extended webinar data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const error = webinarError || participantsError || instancesError;

  if (error) {
    return (
      <AppLayout>
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load webinar details. {error.message}
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  if (isLoading || !webinar) {
    return (
      <AppLayout>
        <WebinarDashboardSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <WebinarDashboardHeader webinar={webinar} />
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={syncAllExtendedData}
              className="flex items-center gap-1"
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Sync Extended Data
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshAllData}
              className="flex items-center gap-1"
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>
        
        <Separator />
        
        <WebinarMetadataHeader 
          webinar={webinar} 
          participants={participants}
          instances={instances} 
        />
        
        <WebinarDashboardTabs 
          webinar={webinar}
          participants={participants}
          instances={instances}
        />
      </div>
    </AppLayout>
  );
};

export default WebinarDashboard;
