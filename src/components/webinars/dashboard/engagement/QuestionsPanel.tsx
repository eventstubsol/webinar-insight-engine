
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Question {
  question: string;
  answer?: string;
  name?: string;
  email?: string;
  question_time?: string;
  answer_time?: string;
  answered: boolean;
  answered_by?: string;
}

interface QuestionsPanelProps {
  questions?: Question[];
  isLoading?: boolean;
}

export const QuestionsPanel: React.FC<QuestionsPanelProps> = ({
  questions = [],
  isLoading = false
}) => {
  const [filter, setFilter] = useState<'all' | 'answered' | 'unanswered'>('all');

  const filteredQuestions = questions.filter(q => {
    if (filter === 'answered') return q.answered;
    if (filter === 'unanswered') return !q.answered;
    return true;
  });

  const answeredCount = questions.filter(q => q.answered).length;
  const unansweredCount = questions.length - answeredCount;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Questions & Answers</CardTitle>
          <CardDescription>Questions asked during the webinar</CardDescription>
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
        <CardTitle>Questions & Answers</CardTitle>
        <CardDescription>
          {questions.length} questions asked during the webinar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              All ({questions.length})
            </TabsTrigger>
            <TabsTrigger value="answered">
              Answered ({answeredCount})
            </TabsTrigger>
            <TabsTrigger value="unanswered">
              Unanswered ({unansweredCount})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <QuestionsList questions={filteredQuestions} />
          </TabsContent>
          <TabsContent value="answered" className="mt-0">
            <QuestionsList questions={filteredQuestions} />
          </TabsContent>
          <TabsContent value="unanswered" className="mt-0">
            <QuestionsList questions={filteredQuestions} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const QuestionsList: React.FC<{ questions: Question[] }> = ({ questions }) => {
  if (questions.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No questions found
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
      {questions.map((q, index) => (
        <div key={index} className="border rounded-lg p-3">
          <div className="flex justify-between items-start mb-2">
            <div className="font-medium">{q.name || 'Anonymous'}</div>
            <Badge variant={q.answered ? "default" : "outline"}>
              {q.answered ? "Answered" : "Unanswered"}
            </Badge>
          </div>
          <p className="mb-2 text-sm">{q.question}</p>
          {q.answered && (
            <div className="bg-muted p-2 rounded-md mt-2">
              <p className="text-xs text-muted-foreground mb-1">
                Answered by {q.answered_by || 'Host'}
              </p>
              <p className="text-sm">{q.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
