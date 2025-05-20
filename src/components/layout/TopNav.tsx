
import React from 'react';
import { Bell, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { UserMenu } from '@/components/auth/UserMenu';
import { useAuth } from '@/contexts/AuthContext';
import { useZoomCredentials, useZoomWebinars } from '@/hooks/zoom';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday } from 'date-fns';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

export const TopNav = () => {
  const { user } = useAuth();
  const { credentialsStatus, isLoading: isLoadingCredentials } = useZoomCredentials();
  const { refreshWebinars, isRefetching, lastSyncTime } = useZoomWebinars();
  const navigate = useNavigate();
  
  const needsZoomSetup = !isLoadingCredentials && user && !credentialsStatus?.hasCredentials;
  const canSyncWebinars = user && credentialsStatus?.hasCredentials;
  
  const handleSync = async () => {
    if (canSyncWebinars) {
      await refreshWebinars(true); // Force sync from Zoom API
    }
  };
  
  // Format last sync time in a friendly way
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never synced';
    
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy h:mm a');
    }
  };
  
  return (
    <div className="border-b border-border bg-background px-4 py-3 flex items-center gap-4 justify-between">
      <div className="flex items-center gap-3 max-w-md flex-1">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          className="bg-transparent border-none shadow-none focus-visible:ring-0 placeholder:text-muted-foreground text-sm"
          type="text" 
          placeholder="Search webinars, reports, attendees..." 
        />
      </div>
      
      <div className="flex items-center gap-3">
        {needsZoomSetup && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            Connect Zoom
          </Button>
        )}
        
        {canSyncWebinars && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  {lastSyncTime && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Last sync: {formatLastSync(lastSyncTime)}
                    </span>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSync}
                    disabled={isRefetching}
                  >
                    {isRefetching ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                        <span>Syncing...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        <span>Sync</span>
                      </>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Sync webinars directly from Zoom
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-xs text-white flex items-center justify-center">3</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start">
                <div className="font-medium">Webinar data import complete</div>
                <div className="text-muted-foreground text-xs">Intro to ZoomLytics - 5 minutes ago</div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start">
                <div className="font-medium">New team member added</div>
                <div className="text-muted-foreground text-xs">Sarah joined your workspace - 2 hours ago</div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start">
                <div className="font-medium">Export ready for download</div>
                <div className="text-muted-foreground text-xs">Q2 Webinars Report - 1 day ago</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        <UserMenu />
      </div>
    </div>
  );
};
