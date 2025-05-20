
import React from 'react';
import { Bell, Search } from 'lucide-react';
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

export const TopNav = () => {
  const { user } = useAuth();
  
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
