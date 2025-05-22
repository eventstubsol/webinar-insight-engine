
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
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ZoomWebinarQuestion } from "@/hooks/zoom";
import { formatDistanceToNow } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface QuestionsPanelProps {
  questions: ZoomWebinarQuestion[];
  isLoading: boolean;
}

export function QuestionsPanel({ questions, isLoading }: QuestionsPanelProps) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  // Toggle collapsible state for a question
  const toggleQuestion = (id: string) => {
    setOpenItems((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="h-5 w-1/3 bg-muted animate-pulse rounded"></div>
            <div className="h-20 bg-muted animate-pulse rounded"></div>
            <div className="h-20 bg-muted animate-pulse rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Q&A
          </CardTitle>
          <CardDescription>
            No questions were asked during this webinar.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const answeredQuestions = questions.filter((q) => q.answered);
  const unansweredQuestions = questions.filter((q) => !q.answered);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Q&A
        </CardTitle>
        <CardDescription>
          {questions.length} questions ({answeredQuestions.length} answered,{" "}
          {unansweredQuestions.length} unanswered)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {questions.map((question) => (
            <Collapsible
              key={question.id}
              open={openItems[question.id]}
              onOpenChange={() => toggleQuestion(question.id)}
              className="border rounded-lg p-3"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="font-medium">{question.question}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>
                      From: {question.name || "Anonymous"}{" "}
                      {question.question_time &&
                        `(${formatDistanceToNow(
                          new Date(question.question_time),
                          { addSuffix: true }
                        )})`}
                    </span>
                    {question.answered ? (
                      <Badge variant="outline" className="bg-green-50">
                        Answered
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50">
                        Unanswered
                      </Badge>
                    )}
                  </div>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {openItems[question.id] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="pt-2">
                {question.answered ? (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-1">
                      <div className="font-medium text-sm">Answer:</div>
                      <div>{question.answer}</div>
                      {question.answer_time && (
                        <div className="text-xs text-muted-foreground">
                          Answered{" "}
                          {formatDistanceToNow(new Date(question.answer_time), {
                            addSuffix: true,
                          })}{" "}
                          {question.answered_by && `by ${question.answered_by}`}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground mt-2">
                    This question hasn't been answered yet.
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
