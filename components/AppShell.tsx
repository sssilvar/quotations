"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, List, Plus } from "lucide-react";
import { AccountMenu } from "@/components/AccountMenu";
import { InstallAppButton } from "@/components/InstallAppButton";
import type { EditableUser } from "@/components/UserSettingsDialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type User = EditableUser & { id: string; role: string };

function AppSidebar({ user, onUserUpdated }: { user: User; onUserUpdated: (user: EditableUser) => void }) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const isAdmin = pathname.startsWith("/admin");
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isNew = pathname === "/dashboard/new";
  const showLabel = !collapsed;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={cn(collapsed && "px-2")}>
        <div className={cn("min-w-0", collapsed && "text-center")}>
          <h1 className={cn("text-lg font-bold text-emerald-700", collapsed && "sr-only")}>Soinsolar</h1>
          {showLabel && <p className="mt-0.5 text-xs text-muted-foreground">Panel comercial</p>}
        </div>
      </SidebarHeader>
      <SidebarContent className={cn(collapsed && "px-2")}>
        <SidebarGroup>
          {showLabel && <SidebarGroupLabel>Navegación</SidebarGroupLabel>}
          <SidebarMenu>
            {user.role === "admin" && (
              <SidebarNavItem href="/admin" active={isAdmin} icon={LayoutDashboard} collapsed={collapsed}>
                Panel admin
              </SidebarNavItem>
            )}
            <SidebarNavItem href="/dashboard" active={isDashboard && !isNew} icon={List} collapsed={collapsed}>
              Cotizaciones
            </SidebarNavItem>
            <SidebarMenuItem>
              <Tooltip>
                <TooltipTrigger render={
                  <Link
                    href="/dashboard/new"
                    aria-label="Nueva cotizacion"
                    className={cn(
                      buttonVariants({ variant: isNew ? "secondary" : "ghost" }),
                      "flex h-10 items-center overflow-hidden rounded-lg text-sm font-medium transition-colors",
                      collapsed ? "justify-center px-0" : "gap-2 px-3",
                      !isNew && "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white",
                    )}
                  />
                }>
                  <Plus className="size-4 shrink-0" />
                  {!collapsed && <span>Nueva cotización</span>}
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">Nueva cotización</TooltipContent>}
              </Tooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className={cn(collapsed && "px-2")}>
        <div className="mb-2">
          <InstallAppButton compact={collapsed} />
        </div>
        <Tooltip>
          <TooltipTrigger render={<div className="w-full" />}>
            <div>
              <AccountMenu user={user} compact={collapsed} onUserUpdated={onUserUpdated} />
            </div>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Mi cuenta</TooltipContent>}
        </Tooltip>
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarNavItem({
  href,
  active,
  collapsed,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  collapsed: boolean;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <SidebarMenuItem>
      <Tooltip>
        <TooltipTrigger
          render={
            <SidebarMenuButton asChild isActive={active} className={collapsed ? "justify-center px-0" : undefined} />
          }
        >
          <Link href={href} aria-label={typeof children === "string" ? children : undefined}>
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span>{children}</span>}
          </Link>
        </TooltipTrigger>
        {collapsed && <TooltipContent side="right">{children}</TooltipContent>}
      </Tooltip>
    </SidebarMenuItem>
  );
}

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const sectionTitle = pathname.startsWith("/admin") ? "Panel admin" : "Cotizaciones";
  const [currentUser, setCurrentUser] = useState(user);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          user={currentUser}
          onUserUpdated={(nextUser) => setCurrentUser((prev) => ({ ...prev, ...nextUser }))}
        />
        <SidebarInset>
          <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{sectionTitle}</p>
              <p className="truncate text-xs text-muted-foreground">Gestion comercial</p>
            </div>
            <div className="lg:hidden">
              <AccountMenu
                user={currentUser}
                onUserUpdated={(nextUser) => setCurrentUser((prev) => ({ ...prev, ...nextUser }))}
              />
            </div>
          </div>
          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
