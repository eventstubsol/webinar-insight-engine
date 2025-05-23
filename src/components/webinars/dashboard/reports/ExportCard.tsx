
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ExportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onExport: () => void;
  isExporting?: boolean;
  className?: string;
}

export const ExportCard: React.FC<ExportCardProps> = ({
  title,
  description,
  icon,
  onExport,
  isExporting = false,
  className
}) => {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          {icon}
          <Button 
            variant="outline" 
            onClick={onExport}
            disabled={isExporting}
            className="flex items-center gap-1"
          >
            <Download className="mr-1 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
