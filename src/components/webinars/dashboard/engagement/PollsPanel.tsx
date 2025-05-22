
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BarChart2 } from "lucide-react";
import { ZoomWebinarPoll } from "@/hooks/zoom";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface PollsPanelProps {
  polls: ZoomWebinarPoll[];
  isLoading: boolean;
}

export function PollsPanel({ polls, isLoading }: PollsPanelProps) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  // Toggle collapsible state for a poll
  const togglePoll = (id: string) => {
    setOpenItems((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="h-5 w-1/3 bg-muted animate-pulse rounded"></div>
            <div className="h-20 bg-muted animate-pulse rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (polls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Polls
          </CardTitle>
          <CardDescription>
            No polls were conducted during this webinar.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalParticipants = polls.reduce(
    (sum, poll) => sum + (poll.total_participants || 0),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart2 className="h-5 w-5" />
          Polls
        </CardTitle>
        <CardDescription>
          {polls.length} polls conducted with {totalParticipants} total
          participants
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {polls.map((poll) => (
            <Collapsible
              key={poll.id}
              open={openItems[poll.id]}
              onOpenChange={() => togglePoll(poll.id)}
              className="border rounded-lg p-3"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="font-medium">{poll.title}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>
                      {poll.total_participants} participants
                      {poll.start_time &&
                        ` • ${formatDistanceToNow(new Date(poll.start_time), {
                          addSuffix: true,
                        })}`}
                    </span>
                    {poll.status && (
                      <Badge variant="outline">
                        {poll.status.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {openItems[poll.id] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="pt-2">
                {poll.questions && Array.isArray(poll.questions) ? (
                  <div className="space-y-4 mt-2">
                    {poll.questions.map((question: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="font-medium text-sm">
                          {question.name || `Question ${index + 1}`}
                        </div>
                        {question.type === "single" && (
                          <div className="space-y-1">
                            {question.answers &&
                              Array.isArray(question.answers) &&
                              question.answers.map(
                                (answer: any, ansIndex: number) => (
                                  <div
                                    key={ansIndex}
                                    className="flex justify-between text-sm"
                                  >
                                    <span>{answer.name}</span>
                                    <span>
                                      {answer.count || 0} votes (
                                      {poll.total_participants > 0
                                        ? Math.round(
                                            ((answer.count || 0) /
                                              poll.total_participants) *
                                              100
                                          )
                                        : 0}
                                      %)
                                    </span>
                                  </div>
                                )
                              )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mt-2">
                    No detailed question data available.
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
