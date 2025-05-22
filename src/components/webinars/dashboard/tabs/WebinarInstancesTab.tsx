
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { ZoomWebinar } from "@/hooks/zoom";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WebinarInstancesTabProps {
  webinar: ZoomWebinar;
  instances?: any[];
}

export function WebinarInstancesTab({ webinar, instances = [] }: WebinarInstancesTabProps) {
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);

  // Format the date and time for display
  const formatDateTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return "Not scheduled";
    try {
      const date = parseISO(dateTimeStr);
      return format(date, "PPp"); // Format: Mar 14, 2023, 2:30 PM
    } catch (e) {
      return "Invalid date";
    }
  };

  // Get status badge for an instance
  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;

    switch (status.toLowerCase()) {
      case "started":
        return <Badge className="bg-green-500">In Progress</Badge>;
      case "waiting":
        return <Badge variant="secondary">Scheduled</Badge>;
      case "ended":
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate duration in a readable format
  const getDuration = (instance: any) => {
    if (!instance.duration) return "N/A";
    if (instance.duration < 60) return `${instance.duration} mins`;
    const hours = Math.floor(instance.duration / 60);
    const mins = instance.duration % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ""}`;
  };

  // Check if this is a recurring webinar
  const isRecurring = webinar.type === 9 || instances.length > 1;

  if (!instances || instances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webinar Instances</CardTitle>
          <CardDescription>
            {isRecurring
              ? "No instances found for this recurring webinar."
              : "This is a single session webinar with no recurring instances."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {isRecurring
                ? "Recurring webinar instances will appear here once scheduled."
                : "This webinar does not have multiple instances."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webinar Instances</CardTitle>
        <CardDescription>
          {isRecurring
            ? `This recurring webinar has ${instances.length} instances.`
            : "Single session webinar details."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Participants</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instances.map((instance) => (
              <TableRow key={instance.instance_id || instance.uuid}>
                <TableCell>
                  <div className="font-medium">
                    {formatDateTime(instance.start_time)}
                  </div>
                  {instance.end_time && (
                    <div className="text-xs text-muted-foreground">
                      Ended: {formatDateTime(instance.end_time)}
                    </div>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(instance.status)}</TableCell>
                <TableCell>{getDuration(instance)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{instance.participants_count || 0}</span>
                    {instance.registrants_count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({instance.registrants_count} registered)
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedInstance(instance.instance_id)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
