
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ZoomWebinar,
  ZoomParticipants, 
  useZoomWebinarQAndA,
  useZoomWebinarPolls
} from "@/hooks/zoom";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ZoomDataService } from "@/hooks/zoom/services/ZoomDataService";
import { useToast } from "@/hooks/use-toast";
import { EngagementMetrics } from "../engagement/EngagementMetrics";
import { QuestionsPanel } from "../engagement/QuestionsPanel";
import { PollsPanel } from "../engagement/PollsPanel";

interface WebinarEngagementTabProps {
  webinar: ZoomWebinar;
  participants: ZoomParticipants;
}

export function WebinarEngagementTab({ webinar, participants }: WebinarEngagementTabProps) {
  const { toast } = useToast();
  
  // Fetch Q&A data
  const {
    questions,
    totalQuestions,
    answeredQuestions,
    isLoading: isLoadingQAndA,
    isRefetching: isRefetchingQAndA,
    error: qandaError,
    refetch: refetchQAndA
  } = useZoomWebinarQAndA(webinar.webinar_id);
  
  // Fetch Polls data
  const {
    polls,
    totalPolls,
    totalParticipants: pollParticipants,
    isLoading: isLoadingPolls,
    isRefetching: isRefetchingPolls,
    error: pollsError,
    refetch: refetchPolls
  } = useZoomWebinarPolls(webinar.webinar_id);
  
  const isLoading = isLoadingQAndA || isLoadingPolls;
  const isRefetching = isRefetchingQAndA || isRefetchingPolls;
  const error = qandaError || pollsError;

  // Get total attendees
  const totalAttendees = participants?.attendees?.length || 0;
  
  // Handle sync button click
  const handleSyncData = async () => {
    try {
      toast({
        title: "Syncing engagement data",
        description: "This may take a moment..."
      });
      
      await ZoomDataService.syncAllWebinarData(webinar.user_id, webinar.webinar_id);
      
      // Refetch data after sync
      await Promise.all([refetchQAndA(), refetchPolls()]);
      
      toast({
        title: "Engagement data synced",
        description: "Q&A and polls data has been updated"
      });
    } catch (err) {
      console.error("Error syncing data:", err);
      toast({
        title: "Sync failed",
        description: "Could not sync engagement data",
        variant: "destructive"
      });
    }
  };
  
  // Display error if any
  if (error && !isLoading) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading engagement data: {error.message}
          <Button variant="outline" size="sm" onClick={handleSyncData} className="ml-2">
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Determine if we have engagement data
  const hasEngagementData = totalQuestions > 0 || totalPolls > 0;
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Webinar Engagement</CardTitle>
            <CardDescription>
              Q&A, Polls, and Audience Interaction Metrics
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncData} 
            disabled={isRefetching}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Syncing...' : 'Sync Data'}
          </Button>
        </CardHeader>
        <CardContent>
          {!hasEngagementData && !isLoading ? (
            <Alert className="bg-muted">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No engagement data found for this webinar. Click "Sync Data" to retrieve the latest Q&A and polls data.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <EngagementMetrics
                totalQuestions={totalQuestions}
                answeredQuestions={answeredQuestions}
                totalPolls={totalPolls}
                pollParticipants={pollParticipants}
                totalAttendees={totalAttendees}
                isLoading={isLoading}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <QuestionsPanel
                  questions={questions}
                  isLoading={isLoadingQAndA}
                />
                
                <PollsPanel
                  polls={polls}
                  isLoading={isLoadingPolls}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
