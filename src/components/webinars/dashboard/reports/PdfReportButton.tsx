
import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfReportButtonProps extends ButtonProps {
  onExport: () => Promise<void>;
  isExporting?: boolean;
}

export const PdfReportButton: React.FC<PdfReportButtonProps> = ({
  onExport,
  isExporting = false,
  className,
  children,
  ...props
}) => {
  return (
    <Button
      variant="outline"
      onClick={onExport}
      disabled={isExporting}
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      <FileText className="h-4 w-4" />
      {isExporting ? 'Generating PDF...' : children || 'Generate PDF Report'}
    </Button>
  );
};
