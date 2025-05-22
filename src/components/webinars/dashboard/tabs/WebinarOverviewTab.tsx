
import React from 'react';
import { ZoomWebinar, ZoomParticipants } from '@/hooks/zoom';
import { StatCard } from '@/components/dashboard/StatCard';
import { 
  Users, 
  UserCheck, 
  Percent, 
  Clock, 
  MessageSquare 
} from 'lucide-react';
import { 
  getTotalRegistrants, 
  getTotalAttendees, 
  getAttendanceRate,
  getAverageDuration,
  getTotalEngagement,
  calculatePercentageChange,
  formatTrendData
} from '@/components/dashboard/utils/statsUtils';

interface WebinarOverviewTabProps {
  webinar: ZoomWebinar;
  participants: ZoomParticipants;
}

export const WebinarOverviewTab: React.FC<WebinarOverviewTabProps> = ({
  webinar,
  participants
}) => {
  const registrants = webinar.raw_data?.registrants_count || 0;
  const attendees = webinar.raw_data?.participants_count || 0;
  const attendanceRate = registrants > 0 ? Math.round((attendees / registrants) * 100) : 0;
  
  // For trend data, we'd typically compare to previous webinars
  // Here we're just using placeholder trends for demonstration
  const registrantsTrend = formatTrendData(15);
  const attendeesTrend = formatTrendData(8);
  const rateTrend = formatTrendData(5);
  const durationTrend = formatTrendData(-3);
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Webinar Overview</h2>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Registration card */}
        <StatCard
          title="Total Registrants"
          value={registrants.toString()}
          description="Number of people who registered"
          icon={<Users size={18} />}
          trend={registrantsTrend}
        />
        
        {/* Attendance card */}
        <StatCard
          title="Total Attendees"
          value={attendees.toString()}
          description="Number of people who attended"
          icon={<UserCheck size={18} />}
          trend={attendeesTrend}
        />
        
        {/* Attendance rate card */}
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          description="Percentage of registrants who attended"
          icon={<Percent size={18} />}
          trend={rateTrend}
        />
        
        {/* Average duration card */}
        <StatCard
          title="Average Duration"
          value={webinar.duration ? `${Math.floor(webinar.duration/60)}h ${webinar.duration % 60}m` : "0h 00m"}
          description="Average time spent in webinar"
          icon={<Clock size={18} />}
          trend={durationTrend}
        />
        
        {/* Placeholder for engagement card */}
        <StatCard
          title="Engagement Score"
          value="Coming soon"
          description="Measure of participant interaction"
          icon={<MessageSquare size={18} />}
        />
      </div>

      {/* Additional sections can be added here */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Webinar Details</h3>
        {/* Additional details about the webinar */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Left column */}
          <div>
            {webinar.agenda && (
              <div className="mb-4">
                <h4 className="font-medium text-sm mb-1">Agenda</h4>
                <p className="text-muted-foreground">{webinar.agenda}</p>
              </div>
            )}
          </div>
          
          {/* Right column - could contain additional meta info */}
          <div>
            {webinar.raw_data && webinar.raw_data.settings && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm mb-1">Settings</h4>
                {webinar.raw_data.settings.approval_type !== undefined && (
                  <div className="flex gap-2">
                    <span className="text-sm font-medium">Registration:</span>
                    <span className="text-sm text-muted-foreground">
                      {webinar.raw_data.settings.approval_type === 0 ? 'Automatic Approval' : 'Manual Approval'}
                    </span>
                  </div>
                )}
                {webinar.raw_data.settings.registration_type !== undefined && (
                  <div className="flex gap-2">
                    <span className="text-sm font-medium">Registration Type:</span>
                    <span className="text-sm text-muted-foreground">
                      {webinar.raw_data.settings.registration_type === 1 ? 'Required' : 'Optional'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
