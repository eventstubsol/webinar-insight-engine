
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageCircle, BarChart2, Users } from "lucide-react";

interface EngagementMetricsProps {
  totalQuestions: number;
  answeredQuestions: number;
  totalPolls: number;
  pollParticipants: number;
  totalAttendees: number;
  isLoading: boolean;
}

export function EngagementMetrics({
  totalQuestions,
  answeredQuestions,
  totalPolls,
  pollParticipants,
  totalAttendees,
  isLoading,
}: EngagementMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="p-4 border rounded-md animate-pulse bg-muted"
            >
              <div className="h-4 w-1/2 bg-muted-foreground/20 rounded mb-2"></div>
              <div className="h-6 w-1/4 bg-muted-foreground/20 rounded"></div>
            </div>
          ))}
      </div>
    );
  }

  // Calculate participation rate
  const participationRate =
    totalAttendees > 0
      ? Math.round((pollParticipants / totalAttendees) * 100)
      : 0;

  // Calculate question answering rate
  const questionAnswerRate =
    totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="p-4 border rounded-md">
        <h3 className="font-medium flex items-center gap-2 text-sm text-muted-foreground">
          <MessageCircle className="h-4 w-4" />
          Q&A Activity
        </h3>
        <p className="text-2xl font-bold mt-2">{totalQuestions}</p>
        <p className="text-sm text-muted-foreground">
          {answeredQuestions} answered ({questionAnswerRate}%)
        </p>
      </div>

      <div className="p-4 border rounded-md">
        <h3 className="font-medium flex items-center gap-2 text-sm text-muted-foreground">
          <BarChart2 className="h-4 w-4" />
          Polls
        </h3>
        <p className="text-2xl font-bold mt-2">{totalPolls}</p>
        <p className="text-sm text-muted-foreground">
          {pollParticipants} participants
        </p>
      </div>

      <div className="p-4 border rounded-md">
        <h3 className="font-medium flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          Participation
        </h3>
        <p className="text-2xl font-bold mt-2">{participationRate}%</p>
        <p className="text-sm text-muted-foreground">
          {pollParticipants} of {totalAttendees} engaged
        </p>
      </div>
    </div>
  );
}
