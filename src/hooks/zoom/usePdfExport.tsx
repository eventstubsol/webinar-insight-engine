
import { useState } from 'react';
import { ZoomWebinar, ZoomParticipants } from './types';
import { formatDate, formatDateTime, formatMinutes } from '@/utils/formatUtils';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const usePdfExport = (webinar: ZoomWebinar, participants?: ZoomParticipants) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToPdf = async (elementId: string, filename: string) => {
    try {
      setIsExporting(true);
      
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error("Element not found for PDF export");
      }

      // Create canvas from the element
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${filename}-${formatDate(new Date())}.pdf`);
      
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

  const exportWebinarSummaryPdf = async () => {
    const elementId = "webinar-summary";
    
    // Create a temporary div for generating the PDF content
    const tempDiv = document.createElement('div');
    tempDiv.id = elementId;
    tempDiv.style.padding = "20px";
    tempDiv.style.backgroundColor = "white";
    tempDiv.style.width = "800px";
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    
    // Format webinar date properly
    const webinarDate = webinar.start_time 
      ? formatDate(new Date(webinar.start_time)) 
      : formatDate(new Date());
    
    // Create content for the PDF
    tempDiv.innerHTML = `
      <h1 style="margin-bottom: 20px; color: #333; font-size: 24px;">${webinar.topic} - Webinar Summary</h1>
      
      <div style="margin-bottom: 30px;">
        <h2 style="margin-bottom: 10px; color: #444; font-size: 18px;">Webinar Details</h2>
        <p><strong>Date:</strong> ${webinarDate}</p>
        <p><strong>Duration:</strong> ${formatMinutes(webinar.duration || 0)}</p>
        <p><strong>Host:</strong> ${webinar.host_email || 'Unknown'}</p>
        <p><strong>Status:</strong> ${webinar.status || 'Unknown'}</p>
        ${webinar.agenda ? `<p><strong>Agenda:</strong> ${webinar.agenda}</p>` : ''}
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="margin-bottom: 10px; color: #444; font-size: 18px;">Attendance Summary</h2>
        <p><strong>Total Registrants:</strong> ${participants?.registrants?.length || 0}</p>
        <p><strong>Total Attendees:</strong> ${participants?.attendees?.length || 0}</p>
        <p><strong>Attendance Rate:</strong> ${participants?.registrants?.length ? 
          `${Math.round((participants?.attendees?.length || 0) / participants.registrants.length * 100)}%` : '0%'}</p>
      </div>
    `;
    
    // Add table of attendees if available
    if (participants?.attendees && participants.attendees.length > 0) {
      let attendeeTable = `
        <div style="margin-bottom: 30px;">
          <h2 style="margin-bottom: 10px; color: #444; font-size: 18px;">Top Attendees</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Name</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Email</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Duration</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      // Take top 10 attendees by duration
      const topAttendees = [...participants.attendees]
        .sort((a, b) => (b.duration || 0) - (a.duration || 0))
        .slice(0, 10);
      
      topAttendees.forEach(attendee => {
        attendeeTable += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${attendee.name || 'Unknown'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${attendee.user_email || 'Unknown'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formatMinutes(Math.floor((attendee.duration || 0) / 60))}</td>
          </tr>
        `;
      });
      
      attendeeTable += `
            </tbody>
          </table>
        </div>
      `;
      
      tempDiv.innerHTML += attendeeTable;
    }
    
    // Add engagement summary if available
    tempDiv.innerHTML += `
      <div style="margin-bottom: 30px;">
        <h2 style="margin-bottom: 10px; color: #444; font-size: 18px;">Engagement Report</h2>
        <p><strong>Average Duration:</strong> ${participants?.attendees?.length ? 
          formatMinutes(Math.round(participants.attendees.reduce((sum, a) => sum + (a.duration || 0), 0) / participants.attendees.length / 60)) : '0m'}</p>
      </div>
    `;
    
    // Add to document, generate PDF and then remove
    document.body.appendChild(tempDiv);
    await exportToPdf(elementId, `${webinar.topic}-summary`);
    document.body.removeChild(tempDiv);
  };

  const exportAttendeeReportPdf = async () => {
    if (!participants?.attendees || participants.attendees.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no attendees to include in the report.",
        variant: "warning"
      });
      return;
    }
    
    const elementId = "attendee-report";
    
    // Create a temporary div for generating the PDF content
    const tempDiv = document.createElement('div');
    tempDiv.id = elementId;
    tempDiv.style.padding = "20px";
    tempDiv.style.backgroundColor = "white";
    tempDiv.style.width = "800px";
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    
    // Create content for the PDF
    tempDiv.innerHTML = `
      <h1 style="margin-bottom: 20px; color: #333; font-size: 24px;">${webinar.topic} - Attendee Report</h1>
      
      <div style="margin-bottom: 30px;">
        <h2 style="margin-bottom: 10px; color: #444; font-size: 18px;">Webinar Information</h2>
        <p><strong>Date:</strong> ${webinar.start_time ? formatDate(new Date(webinar.start_time)) : formatDate(new Date())}</p>
        <p><strong>Total Attendees:</strong> ${participants.attendees.length}</p>
        <p><strong>Host:</strong> ${webinar.host_email || 'Unknown'}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="margin-bottom: 10px; color: #444; font-size: 18px;">Attendee List</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Name</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Email</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Join Time</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Leave Time</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Duration</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    participants.attendees.forEach(attendee => {
      tempDiv.innerHTML += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${attendee.name || 'Unknown'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${attendee.user_email || 'Unknown'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${attendee.join_time ? formatDateTime(new Date(attendee.join_time)) : 'N/A'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${attendee.leave_time ? formatDateTime(new Date(attendee.leave_time)) : 'N/A'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${formatMinutes(Math.floor((attendee.duration || 0) / 60))}</td>
        </tr>
      `;
    });
    
    tempDiv.innerHTML += `
          </tbody>
        </table>
      </div>
    `;
    
    // Add to document, generate PDF and then remove
    document.body.appendChild(tempDiv);
    await exportToPdf(elementId, `${webinar.topic}-attendees`);
    document.body.removeChild(tempDiv);
  };

  return {
    isExporting,
    exportWebinarSummaryPdf,
    exportAttendeeReportPdf
  };
};
