
import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Gauge,
  Video,
  Users,
  Settings,
  ChevronDown,
  MenuIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  isCollapsed: boolean;
}

export function AppSidebar({ className, isCollapsed }: SidebarNavProps) {
  const { currentWorkspace, userRole } = useWorkspace();
  const isAdmin = userRole === 'owner' || userRole === 'admin';

  return (
    <div
      className={cn(
        "flex flex-col h-screen border-r bg-background shrink-0 transition-all duration-300",
        isCollapsed ? "w-[70px]" : "w-[240px]",
        className
      )}
    >
      <div className={cn(
        "flex items-center h-16 border-b",
        isCollapsed ? "justify-center px-2" : "px-4"
      )}>
        {!isCollapsed && <WorkspaceSwitcher />}
        {isCollapsed && (
          <Button variant="ghost" className="w-10 h-10 p-0 rounded-full">
            {currentWorkspace?.name?.charAt(0) || "W"}
          </Button>
        )}
      </div>
      <ScrollArea>
        <div
          className={cn(
            "flex flex-col gap-2 py-2",
            isCollapsed ? "items-center px-2" : "px-4"
          )}
        >
          <NavItem
            to="/dashboard"
            icon={<Gauge className="h-4 w-4" />}
            label="Dashboard"
            isCollapsed={isCollapsed}
          />
          <NavItem
            to="/webinars"
            icon={<Video className="h-4 w-4" />}
            label="Webinars"
            isCollapsed={isCollapsed}
          />
          {!isCollapsed && (
            <>
              <Separator className="my-2" />
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
                Workspace
              </div>
            </>
          )}
          {isAdmin && (
            <NavItem
              to="/workspace/members"
              icon={<Users className="h-4 w-4" />}
              label="Members"
              isCollapsed={isCollapsed}
            />
          )}
          <NavItem
            to="/workspace/settings"
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
            isCollapsed={isCollapsed}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  children?: React.ReactNode;
}

function NavItem({ to, icon, label, isCollapsed, children }: NavItemProps) {
  const [open, setOpen] = React.useState(false);

  return children ? (
    <Collapsible
      open={open && !isCollapsed}
      onOpenChange={isCollapsed ? undefined : setOpen}
      className="w-full"
    >
      <CollapsibleTrigger asChild>
        <div>
          <NavLink
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "transparent",
                isCollapsed ? "justify-center w-10 h-10 p-0" : "w-full justify-between"
              )
            }
          >
            <div className="flex items-center gap-2">
              {icon}
              {!isCollapsed && <span>{label}</span>}
            </div>
            {!isCollapsed && children && (
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  open ? "rotate-180" : ""
                )}
              />
            )}
          </NavLink>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  ) : (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
          isActive
            ? "bg-accent text-accent-foreground"
            : "transparent",
          isCollapsed ? "justify-center w-10 h-10 p-0" : "w-full"
        )
      }
    >
      {icon}
      {!isCollapsed && <span>{label}</span>}
    </NavLink>
  );
}
