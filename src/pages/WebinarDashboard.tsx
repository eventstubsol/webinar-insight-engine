
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarDashboardHeader } from '@/components/webinars/dashboard/WebinarDashboardHeader';
import { WebinarDashboardTabs } from '@/components/webinars/dashboard/WebinarDashboardTabs';
import { WebinarDashboardSkeleton } from '@/components/webinars/dashboard/WebinarDashboardSkeleton';
import { useZoomWebinarDetails, useZoomWebinarParticipants, ZoomParticipants } from '@/hooks/zoom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
  
  const { 
    webinar, 
    isLoading: isWebinarLoading,
    error: webinarError
  } = useZoomWebinarDetails(webinarId || null);
  
  const { 
    participants: rawParticipants, 
    isLoading: isParticipantsLoading 
  } = useZoomWebinarParticipants(webinarId || null);
  
  const isLoading = isWebinarLoading || isParticipantsLoading;

  // Safely cast participants to the expected ZoomParticipants type
  const participants: ZoomParticipants = safeParticipantsCast(rawParticipants);

  // If webinar doesn't exist and loading is complete, redirect to webinars list
  useEffect(() => {
    if (!isLoading && !webinar && webinarId) {
      navigate('/webinars');
    }
  }, [webinar, isLoading, navigate, webinarId]);

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
        <WebinarDashboardHeader webinar={webinar} />
        <WebinarDashboardTabs 
          webinar={webinar}
          participants={participants}
        />
      </div>
    </AppLayout>
  );
};

export default WebinarDashboard;
