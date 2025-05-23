
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PollQuestion {
  name: string;
  type: string;
  answers: string[];
  answersCount: number[];
  totalAnswers: number;
}

interface Poll {
  poll_id: string;
  title: string;
  questions: PollQuestion[];
  status: string;
  total_participants: number;
  start_time?: string;
}

interface PollsPanelProps {
  polls?: Poll[];
  isLoading?: boolean;
}

export const PollsPanel: React.FC<PollsPanelProps> = ({
  polls = [],
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Polls</CardTitle>
          <CardDescription>Polls conducted during the webinar</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Polls</CardTitle>
        <CardDescription>
          {polls.length} {polls.length === 1 ? 'poll' : 'polls'} conducted during the webinar
        </CardDescription>
      </CardHeader>
      <CardContent>
        {polls.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No polls conducted during this webinar
          </div>
        ) : (
          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
            {polls.map((poll, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-sm">{poll.title}</h4>
                  <Badge variant={poll.status === 'ended' ? 'default' : 'outline'}>
                    {poll.status}
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  {poll.questions?.map((question, qIndex) => (
                    <div key={qIndex} className="space-y-2">
                      <p className="text-xs font-medium">{question.name}</p>
                      
                      {question.answers?.map((answer, aIndex) => {
                        const count = question.answersCount?.[aIndex] || 0;
                        const percentage = question.totalAnswers > 0 
                          ? Math.round((count / question.totalAnswers) * 100) 
                          : 0;
                          
                        return (
                          <div key={aIndex} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{answer}</span>
                              <span>{count} ({percentage}%)</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 text-xs text-muted-foreground">
                  {poll.total_participants} participants responded
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
