
import React from 'react';
import { ZoomWebinar } from '@/hooks/zoom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FilePieChart, FileText } from 'lucide-react';

interface ReportOption {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface WebinarReportsTabProps {
  webinar: ZoomWebinar;
}

export const WebinarReportsTab: React.FC<WebinarReportsTabProps> = ({
  webinar
}) => {
  // These would connect to actual export functions in a real implementation
  const handleExport = (type: string) => {
    console.log(`Exporting ${type} report for webinar ${webinar.id}`);
    // Implementation would go here
  };
  
  const reportOptions: ReportOption[] = [
    {
      title: 'Registration Report',
      description: 'Export a detailed list of all registrants with their information.',
      icon: <FileText className="h-8 w-8 text-primary" />,
      onClick: () => handleExport('registration')
    },
    {
      title: 'Attendance Report',
      description: 'Export attendee data including join time, leave time, and duration.',
      icon: <FileSpreadsheet className="h-8 w-8 text-primary" />,
      onClick: () => handleExport('attendance')
    },
    {
      title: 'Analytics Report',
      description: 'Export charts and metrics about registration, attendance, and engagement.',
      icon: <FilePieChart className="h-8 w-8 text-primary" />,
      onClick: () => handleExport('analytics')
    }
  ];
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Webinar Reports</h2>
        
        <Button variant="default" className="gap-2">
          <Download className="h-4 w-4" />
          Export All Reports
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportOptions.map((option, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {option.title}
              </CardTitle>
              <CardDescription>
                {option.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                {option.icon}
                <Button variant="outline" onClick={option.onClick}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
