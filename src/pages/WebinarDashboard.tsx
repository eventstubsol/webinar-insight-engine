
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
    refetch: refetchParticipants 
  } = useZoomWebinarParticipants(webinarId || null);

  const {
    instances,
    isLoading: isInstancesLoading,
    refetch: refetchInstances
  } = useZoomWebinarInstances(webinarId);
  
  const isLoading = isWebinarLoading || isParticipantsLoading || isInstancesLoading;

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

  if (webinarError) {
    return (
      <AppLayout>
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load webinar details. {webinarError.message}
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshAllData}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
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
