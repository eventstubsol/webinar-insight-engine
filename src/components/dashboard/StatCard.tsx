
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TrendData {
  value: number; // Percentage change
  label: string; // Display text like "+15%"
  direction: 'up' | 'down' | 'flat';
}

interface StatCardProps {
  title: string;
  value: string | React.ReactNode;
  description: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  cardColor?: string;
  trend?: TrendData;
}

export const StatCard = ({ 
  title, 
  value, 
  description, 
  icon, 
  isLoading = false, 
  cardColor,
  trend
}: StatCardProps) => {
  return (
    <Card className={cardColor}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
        <CardTitle className="text-xs font-medium sm:text-sm">{title}</CardTitle>
        <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-4 pt-0">
        <div className="flex items-center justify-between">
          {isLoading ? (
            <Skeleton className="h-8 w-24 mb-1" />
          ) : (
            <div className="text-xl font-bold h-8 flex items-center">{value}</div>
          )}
          
          {trend && !isLoading && (
            <Badge 
              variant={trend.direction === 'up' ? 'success' : trend.direction === 'down' ? 'destructive' : 'secondary'} 
              className="ml-2 text-xs font-medium"
            >
              {trend.direction === 'up' && <ArrowUp className="mr-1 h-3 w-3" />}
              {trend.direction === 'down' && <ArrowDown className="mr-1 h-3 w-3" />}
              {trend.label}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs sm:text-sm mt-1">{description}</CardDescription>
      </CardContent>
    </Card>
  );
};
