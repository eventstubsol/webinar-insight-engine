
import { useState } from 'react';
import { ZoomWebinar, ZoomParticipants } from './types';
import { formatDate } from '@/utils/formatUtils';
import { useToast } from '@/hooks/use-toast';
import { 
  generateAndDownloadPdf
} from './pdf/pdfUtils';
import {
  generateWebinarSummaryContent,
  generateAttendeeReportContent
} from './pdf/pdfTemplates';

/**
 * Hook for PDF export functionality for Zoom webinars
 */
export const usePdfExport = (webinar: ZoomWebinar, participants?: ZoomParticipants) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  /**
   * Generic method to handle PDF export with error handling and toast notifications
   */
  const exportToPdf = async (
    elementId: string, 
    content: string,
    filename: string
  ) => {
    try {
      setIsExporting(true);
      
      await generateAndDownloadPdf(elementId, content, `${filename}-${formatDate(new Date())}`);
      
      toast({
        title: "Export successful",
        description: `${filename} has been downloaded as a PDF.`
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error creating the PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Exports webinar summary as PDF
   */
  const exportWebinarSummaryPdf = async () => {
    const content = generateWebinarSummaryContent(webinar, participants);
    await exportToPdf("webinar-summary", content, `${webinar.topic}-summary`);
  };

  /**
   * Exports attendee report as PDF
   */
  const exportAttendeeReportPdf = async () => {
    if (!participants?.attendees || participants.attendees.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no attendees to include in the report.",
        variant: "warning"
      });
      return;
    }
    
    const content = generateAttendeeReportContent(webinar, participants);
    await exportToPdf("attendee-report", content, `${webinar.topic}-attendees`);
  };

  return {
    isExporting,
    exportWebinarSummaryPdf,
    exportAttendeeReportPdf
  };
};
