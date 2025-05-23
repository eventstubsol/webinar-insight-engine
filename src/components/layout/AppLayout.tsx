
import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopNav } from './TopNav';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  
  // Automatically collapse sidebar on mobile devices
  useEffect(() => {
    setSidebarCollapsed(isMobile);
  }, [isMobile]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar 
          isCollapsed={sidebarCollapsed} 
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopNav onToggleSidebar={toggleSidebar} />
          <main className="flex-1 p-4 md:p-6 overflow-x-hidden animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
