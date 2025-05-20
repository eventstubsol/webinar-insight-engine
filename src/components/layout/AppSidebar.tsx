
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  ChartBar, 
  Filter, 
  Folder, 
  Home, 
  Settings, 
  Share, 
  Users 
} from 'lucide-react';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter,
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader,
  SidebarMenu, 
  SidebarMenuItem,
  SidebarMenuButton, 
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const mainMenuItems = [
  { title: 'Dashboard', icon: Home, path: '/' },
  { title: 'Webinars', icon: Calendar, path: '/webinars' },
  { title: 'Analytics', icon: ChartBar, path: '/analytics' },
  { title: 'Reports', icon: Folder, path: '/reports' },
];

const toolsMenuItems = [
  { title: 'Data Filters', icon: Filter, path: '/filters' },
  { title: 'Team', icon: Users, path: '/team' },
  { title: 'Sharing', icon: Share, path: '/sharing' },
  { title: 'Settings', icon: Settings, path: '/settings' },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="py-4">
        <div className="px-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-teal-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">Z</span>
          </div>
          <div className="font-bold text-xl">ZoomLytics</div>
        </div>
        <SidebarTrigger />
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.path} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.path} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-primary-foreground">JD</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="font-medium">John Doe</div>
              <div className="text-muted-foreground text-xs">Admin</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
