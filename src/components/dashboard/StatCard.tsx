
import React, { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | undefined;
  description: string;
  icon: ReactNode;
  isLoading?: boolean;
  cardColor?: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'flat';
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  isLoading = false,
  cardColor = 'bg-background',
  trend
}) => {
  return (
    <Card className={cn("overflow-hidden", cardColor)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">{title}</h3>
          <div className="p-1 rounded-full bg-background/80">
            {icon}
          </div>
        </div>
        
        <div className="text-2xl font-bold">
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            value || '0'
          )}
        </div>
        
        <div className="flex items-center pt-1">
          <p className="text-xs text-muted-foreground">{description}</p>
          
          {trend && !isLoading && (
            <div className={cn(
              "ml-auto flex items-center text-xs",
              trend.direction === 'up' ? 'text-green-600' : 
              trend.direction === 'down' ? 'text-red-600' : 'text-gray-500'
            )}>
              {trend.direction === 'up' && <TrendingUp className="mr-1 h-3 w-3" />}
              {trend.direction === 'down' && <TrendingDown className="mr-1 h-3 w-3" />}
              {trend.direction === 'flat' && <Minus className="mr-1 h-3 w-3" />}
              <span>{trend.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
