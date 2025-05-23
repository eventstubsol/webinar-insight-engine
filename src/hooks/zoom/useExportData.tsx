
import { useState } from 'react';
import { ZoomWebinar, ZoomParticipants } from './types';
import { formatDate, formatDateTime, formatMinutes } from '@/utils/formatUtils';
import { useToast } from '@/hooks/use-toast';

interface ExportOptions {
  includeAttendees?: boolean;
  includeRegistrants?: boolean;
  includeQuestions?: boolean;
  includePolls?: boolean;
}

export const useExportData = (webinar: ZoomWebinar, participants?: ZoomParticipants) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToCSV = async (data: any[], filename: string) => {
    try {
      setIsExporting(true);
      
      // Convert data to CSV format
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      ).join('\n');
      
      const csvContent = `${headers}\n${rows}`;
      
      // Create a blob and download it
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}-${formatDate(new Date())}.csv`);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export successful",
        description: `${filename} has been downloaded as a CSV file.`
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportRegistrationReport = async (options: ExportOptions = {}) => {
    if (!participants?.registrants || participants.registrants.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no registrants to include in the report.",
        variant: "warning"
      });
      return;
    }
    
    // Process registrant data to make it suitable for CSV export
    const registrantData = participants.registrants.map(registrant => ({
      Email: registrant.email || '',
      FirstName: registrant.first_name || '',
      LastName: registrant.last_name || '',
      FullName: `${registrant.first_name || ''} ${registrant.last_name || ''}`.trim(),
      RegistrationTime: registrant.create_time ? formatDateTime(new Date(registrant.create_time)) : '',
      Status: registrant.status || '',
      JoinUrl: registrant.join_url || ''
    }));
    
    await exportToCSV(registrantData, `${webinar.topic}-registrants`);
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
    
    // Process attendee data for CSV export
    const attendeeData = participants.attendees.map(attendee => ({
      Email: attendee.user_email || '',
      Name: attendee.name || '',
      JoinTime: attendee.join_time ? formatDateTime(new Date(attendee.join_time)) : '',
      LeaveTime: attendee.leave_time ? formatDateTime(new Date(attendee.leave_time)) : '',
      Duration: formatMinutes(Math.floor((attendee.duration || 0) / 60)),
      DurationInMinutes: Math.floor((attendee.duration || 0) / 60)
    }));
    
    await exportToCSV(attendeeData, `${webinar.topic}-attendees`);
  };

  const exportAnalyticsReport = async (options: ExportOptions = {}) => {
    // Prepare analytics data combining multiple data sources
    const analyticsData = [{
      WebinarName: webinar.topic,
      Date: formatDate(webinar.start_time ? new Date(webinar.start_time) : new Date()),
      TotalRegistrants: participants?.registrants?.length || 0,
      TotalAttendees: participants?.attendees?.length || 0,
      AttendanceRate: participants?.registrants?.length ? 
        `${Math.round((participants?.attendees?.length || 0) / participants.registrants.length * 100)}%` : '0%',
      AverageDuration: participants?.attendees?.length ? 
        formatMinutes(Math.round(participants.attendees.reduce((sum, a) => sum + (a.duration || 0), 0) / participants.attendees.length / 60)) : '0m',
      WebinarDuration: formatMinutes(webinar.duration || 0),
      Host: webinar.host_email || 'Unknown'
    }];
    
    await exportToCSV(analyticsData, `${webinar.topic}-analytics`);
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
