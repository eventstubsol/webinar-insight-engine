
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface EngagementMetricsProps {
  totalQuestions: number;
  answeredQuestions: number;
  totalPolls: number;
  pollParticipants: number;
  totalAttendees: number;
  isLoading?: boolean;
}

export const EngagementMetrics: React.FC<EngagementMetricsProps> = ({
  totalQuestions,
  answeredQuestions,
  totalPolls,
  pollParticipants,
  totalAttendees,
  isLoading = false
}) => {
  // Calculate percentages
  const questionsAnsweredPercentage = totalQuestions > 0 
    ? Math.round((answeredQuestions / totalQuestions) * 100) 
    : 0;

  const pollParticipationPercentage = totalAttendees > 0 && totalPolls > 0
    ? Math.round((pollParticipants / totalAttendees) * 100)
    : 0;
    
  // Format for display
  const formatMetric = (value: number) => {
    return value.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: "Q&A Activity",
      value: formatMetric(totalQuestions),
      description: `${answeredQuestions} answered (${questionsAnsweredPercentage}%)`,
      color: "bg-blue-100 dark:bg-blue-900"
    },
    {
      title: "Poll Engagement",
      value: formatMetric(totalPolls),
      description: totalPolls > 0 ? `${pollParticipationPercentage}% participation rate` : "No polls conducted",
      color: "bg-purple-100 dark:bg-purple-900"
    },
    {
      title: "Total Attendees",
      value: formatMetric(totalAttendees),
      description: "Unique attendees",
      color: "bg-green-100 dark:bg-green-900"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className={`py-3 ${metric.color}`}>
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            <div className="text-2xl font-bold mb-1">{metric.value}</div>
            <p className="text-xs text-muted-foreground">{metric.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
