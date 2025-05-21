
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: string | React.ReactNode;
  description: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  cardColor?: string;
}

export const StatCard = ({ 
  title, 
  value, 
  description, 
  icon, 
  isLoading = false, 
  cardColor 
}: StatCardProps) => {
  return (
    <Card className={cardColor}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
        <CardTitle className="text-xs font-medium sm:text-sm">{title}</CardTitle>
        <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        {isLoading ? (
          <Skeleton className="h-6 w-20 mb-1" />
        ) : (
          <div className="text-lg sm:text-xl font-bold">{value}</div>
        )}
        <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
      </CardContent>
    </Card>
  );
};
