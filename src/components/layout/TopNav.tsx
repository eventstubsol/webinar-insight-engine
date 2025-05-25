
import React from 'react';
import { Bell, Search, RefreshCw, CheckCircle2, WifiOff, Download } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { ComprehensiveSyncDialog } from '@/components/webinars/ComprehensiveSyncDialog';

export const TopNav = () => {
  const { user } = useAuth();
  const { credentialsStatus, isLoading: isLoadingCredentials } = useZoomCredentials();
  const { refreshWebinars, isRefetching, lastSyncTime } = useZoomWebinars();
  const navigate = useNavigate();
  
  const needsZoomSetup = !isLoadingCredentials && user && !credentialsStatus?.hasCredentials;
  const canSyncWebinars = user && credentialsStatus?.hasCredentials;
  
  const handleQuickSync = async () => {
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
        {/* Zoom Connection Status Badge */}
        {user && !isLoadingCredentials && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={credentialsStatus?.hasCredentials ? "success" : "warning"}
                    className="flex items-center gap-1 px-2 py-1 text-xs"
                  >
                    {credentialsStatus?.hasCredentials ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Zoom: Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3" />
                        <span>Zoom: Not Connected</span>
                      </>
                    )}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {credentialsStatus?.hasCredentials 
                  ? "Your Zoom account is connected" 
                  : "Connect your Zoom account to view webinars"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {needsZoomSetup && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/webinars')}
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
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={isRefetching}
                        className="gap-2"
                      >
                        {isRefetching ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Syncing...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            <span>Sync</span>
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Sync Options</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleQuickSync} disabled={isRefetching}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Quick Sync
                        <span className="text-xs text-muted-foreground ml-auto">Basic data</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <ComprehensiveSyncDialog 
                          trigger={
                            <div className="flex items-center w-full cursor-pointer">
                              <Download className="h-4 w-4 mr-2" />
                              Comprehensive Sync
                              <span className="text-xs text-muted-foreground ml-auto">All data</span>
                            </div>
                          }
                        />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Choose between quick sync or comprehensive data sync
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
