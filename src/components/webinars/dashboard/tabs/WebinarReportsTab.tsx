
import React from 'react';
import { ZoomWebinar, ZoomParticipants, useZoomWebinarParticipants } from '@/hooks/zoom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FilePieChart, FileText } from 'lucide-react';
import { useExportData } from '@/hooks/zoom/useExportData';
import { usePdfExport } from '@/hooks/zoom/usePdfExport';
import { ExportCard } from '../reports/ExportCard';
import { PdfReportButton } from '../reports/PdfReportButton';
import { Skeleton } from '@/components/ui/skeleton';

interface WebinarReportsTabProps {
  webinar: ZoomWebinar;
}

export const WebinarReportsTab: React.FC<WebinarReportsTabProps> = ({
  webinar
}) => {
  // Fetch participants data for the exports
  const { participants, isLoading: isLoadingParticipants } = useZoomWebinarParticipants(webinar.webinar_id);
  
  // Use our export hooks
  const { 
    isExporting: isCsvExporting, 
    exportRegistrationReport, 
    exportAttendanceReport, 
    exportAnalyticsReport 
  } = useExportData(webinar, participants);
  
  const {
    isExporting: isPdfExporting,
    exportWebinarSummaryPdf
  } = usePdfExport(webinar, participants);
  
  const isExporting = isCsvExporting || isPdfExporting;
  
  // Export all reports at once
  const handleExportAll = async () => {
    await exportRegistrationReport();
    await exportAttendanceReport();
    await exportAnalyticsReport();
  };
  
  const reportOptions = [
    {
      title: 'Registration Report',
      description: 'Export a detailed list of all registrants with their information.',
      icon: <FileText className="h-8 w-8 text-primary" />,
      onClick: () => exportRegistrationReport()
    },
    {
      title: 'Attendance Report',
      description: 'Export attendee data including join time, leave time, and duration.',
      icon: <FileSpreadsheet className="h-8 w-8 text-primary" />,
      onClick: () => exportAttendanceReport()
    },
    {
      title: 'Analytics Report',
      description: 'Export charts and metrics about registration, attendance, and engagement.',
      icon: <FilePieChart className="h-8 w-8 text-primary" />,
      onClick: () => exportAnalyticsReport()
    }
  ];
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">Webinar Reports</h2>
        
        <div className="flex flex-wrap gap-3">
          <PdfReportButton 
            onExport={exportWebinarSummaryPdf}
            isExporting={isPdfExporting}
          >
            Generate PDF Summary
          </PdfReportButton>
          
          <Button 
            variant="default" 
            className="gap-2"
            onClick={handleExportAll}
            disabled={isExporting || isLoadingParticipants}
          >
            <Download className="h-4 w-4" />
            {isCsvExporting ? 'Exporting...' : 'Export All CSV'}
          </Button>
        </div>
      </div>
      
      {isLoadingParticipants ? (
        // Loading state skeleton
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reportOptions.map((option, index) => (
            <ExportCard
              key={index}
              title={option.title}
              description={option.description}
              icon={option.icon}
              onExport={option.onClick}
              isExporting={isCsvExporting}
            />
          ))}
        </div>
      )}
    </div>
  );
};
