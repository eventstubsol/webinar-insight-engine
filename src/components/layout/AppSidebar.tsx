
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
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';

export function AppSidebar() {
  const { user, profile, signOut, isAdmin } = useAuth();
  
  const mainMenuItems = [
    { title: 'Dashboard', icon: Home, path: '/dashboard' },
    { title: 'Webinars', icon: Calendar, path: '/webinars' },
    { title: 'Analytics', icon: ChartBar, path: '/analytics' },
    { title: 'Reports', icon: Folder, path: '/reports' },
  ];

  const toolsMenuItems = [
    { title: 'Data Filters', icon: Filter, path: '/filters' },
    { title: 'Team', icon: Users, path: '/team', adminOnly: true },
    { title: 'Sharing', icon: Share, path: '/sharing' },
    { title: 'Settings', icon: Settings, path: '/settings' },
  ];

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="py-4">
        <div className="px-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-teal-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <div className="font-bold text-xl">WebinarWise</div>
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
              {toolsMenuItems
                .filter(item => !item.adminOnly || isAdmin)
                .map((item) => (
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

      {user && (
        <SidebarFooter>
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserAvatar className="h-8 w-8" />
              <div className="text-sm">
                <div className="font-medium">{displayName}</div>
                <div className="text-muted-foreground text-xs">
                  {isAdmin ? 'Admin' : 'User'}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => signOut()}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
