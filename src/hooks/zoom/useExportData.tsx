
import { useState } from 'react';
import { ZoomWebinar, ZoomParticipants } from './types';
import { useToast } from '@/hooks/use-toast';
import { handleExportWithNotification } from './csv/csvUtils';
import {
  generateRegistrantReportData,
  generateAttendeeReportData,
  generateAnalyticsReportData
} from './csv/reportGenerators';

interface ExportOptions {
  includeAttendees?: boolean;
  includeRegistrants?: boolean;
  includeQuestions?: boolean;
  includePolls?: boolean;
}

export const useExportData = (webinar: ZoomWebinar, participants?: ZoomParticipants) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportRegistrationReport = async (options: ExportOptions = {}) => {
    if (!participants?.registrants || participants.registrants.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no registrants to include in the report.",
        variant: "warning"
      });
      return;
    }
    
    const registrantData = generateRegistrantReportData(webinar, participants);
    await handleExportWithNotification(
      registrantData, 
      `${webinar.topic}-registrants`,
      toast,
      setIsExporting
    );
  };

  const exportAttendanceReport = async (options: ExportOptions = {}) => {
    if (!participants?.attendees || participants.attendees.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no attendees to include in the report.",
        variant: "warning"
      });
      return;
    }
    
    const attendeeData = generateAttendeeReportData(webinar, participants);
    await handleExportWithNotification(
      attendeeData,
      `${webinar.topic}-attendees`,
      toast,
      setIsExporting
    );
  };

  const exportAnalyticsReport = async (options: ExportOptions = {}) => {
    const analyticsData = generateAnalyticsReportData(webinar, participants);
    await handleExportWithNotification(
      analyticsData,
      `${webinar.topic}-analytics`,
      toast,
      setIsExporting
    );
  };

  const exportFullReport = async (options: ExportOptions = {}) => {
    try {
      setIsExporting(true);
      toast({
        title: "Generating full report",
        description: "Please wait while we compile all webinar data..."
      });

      // Export all reports in sequence
      await exportRegistrationReport(options);
      await exportAttendanceReport(options);
      await exportAnalyticsReport(options);
      
      toast({
        title: "Export complete",
        description: "All webinar data has been exported successfully."
      });
    } catch (error) {
      console.error("Full export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting all data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    exportRegistrationReport,
    exportAttendanceReport,
    exportAnalyticsReport,
    exportFullReport
  };
};
