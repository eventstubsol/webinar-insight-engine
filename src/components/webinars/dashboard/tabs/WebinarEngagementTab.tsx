
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ZoomWebinar, ZoomParticipants } from "@/hooks/zoom";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WebinarEngagementTabProps {
  webinar: ZoomWebinar;
  participants: ZoomParticipants;
}

export function WebinarEngagementTab({ webinar, participants }: WebinarEngagementTabProps) {
  const hasEngagementData = false; // This will be true once we implement data collection
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Webinar Engagement</CardTitle>
          <CardDescription>
            Q&A, Polls, and Audience Interaction Metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasEngagementData ? (
            <Alert className="bg-muted">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Engagement data collection is in progress. Once implemented, this section will display:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Q&A statistics and questions list</li>
                  <li>Poll results and participation rates</li>
                  <li>Chat activity metrics</li>
                  <li>Attendee attention tracking</li>
                  <li>Interactive elements engagement</li>
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Placeholder for engagement metrics */}
              <div className="p-4 border rounded-md">
                <h3 className="font-medium">Q&A Activity</h3>
                <p className="text-2xl font-bold mt-2">0</p>
                <p className="text-sm text-muted-foreground">Questions asked</p>
              </div>
              
              <div className="p-4 border rounded-md">
                <h3 className="font-medium">Polls</h3>
                <p className="text-2xl font-bold mt-2">0</p>
                <p className="text-sm text-muted-foreground">Total polls conducted</p>
              </div>
              
              <div className="p-4 border rounded-md">
                <h3 className="font-medium">Chat Messages</h3>
                <p className="text-2xl font-bold mt-2">0</p>
                <p className="text-sm text-muted-foreground">Total messages sent</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
