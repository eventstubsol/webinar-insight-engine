
import { useState } from 'react';
import { ZoomWebinar, ZoomParticipants } from './types';
import { formatDate } from '@/utils/formatUtils';
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
      Name: `${registrant.first_name || ''} ${registrant.last_name || ''}`,
      RegistrationTime: registrant.create_time || '',
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
      JoinTime: attendee.join_time || '',
      LeaveTime: attendee.leave_time || '',
      Duration: `${Math.floor((attendee.duration || 0) / 60)} minutes`
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
        `${Math.round(participants.attendees.reduce((sum, a) => sum + (a.duration || 0), 0) / participants.attendees.length / 60)} minutes` : '0 minutes',
      WebinarDuration: `${webinar.duration || 0} minutes`,
      Host: webinar.host_email || 'Unknown'
    }];
    
    await exportToCSV(analyticsData, `${webinar.topic}-analytics`);
  };

  return {
    isExporting,
    exportRegistrationReport,
    exportAttendanceReport,
    exportAnalyticsReport
  };
};
