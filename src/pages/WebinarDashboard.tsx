
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarDashboardHeader } from '@/components/webinars/dashboard/WebinarDashboardHeader';
import { WebinarDashboardError } from '@/components/webinars/dashboard/WebinarDashboardError';
import { WebinarDashboardActions } from '@/components/webinars/dashboard/WebinarDashboardActions';
import { WebinarMetadataHeader } from '@/components/webinars/dashboard/WebinarMetadataHeader';
import { WebinarDashboardTabs } from '@/components/webinars/dashboard/WebinarDashboardTabs';
import { WebinarDashboardSkeleton } from '@/components/webinars/dashboard/WebinarDashboardSkeleton';
import { 
  useZoomWebinarDetails, 
  useZoomWebinarParticipants, 
  useZoomWebinarInstances
} from '@/hooks/zoom';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { safeParticipantsCast } from '@/hooks/zoom/utils/participantUtils';

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
  const participants = safeParticipantsCast(rawParticipants);

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

  const error = webinarError || participantsError || instancesError;

  if (error) {
    return (
      <AppLayout>
        <WebinarDashboardError 
          message={`Failed to load webinar details. ${error.message}`} 
        />
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
          <WebinarDashboardActions 
            webinarId={webinarId || ''} 
            userId={webinar?.user_id || ''}
            onRefresh={refreshAllData}
            isRefetching={isRefetching}
          />
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
