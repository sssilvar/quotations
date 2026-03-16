"use client";

import * as React from "react";
import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_ICON = "4rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const SIDEBAR_STORAGE_KEY = "app-sidebar-open";
const SIDEBAR_STORAGE_EVENT = "app-sidebar-open-change";

function readSidebarOpen(defaultOpen: boolean) {
  if (typeof window === "undefined") return defaultOpen;
  const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored === null) return defaultOpen;
  return stored === "true";
}

type SidebarContextValue = {
  isMobile: boolean;
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within SidebarProvider.");
  return context;
}

type SidebarProviderProps = React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  style,
  children,
  ...props
}: SidebarProviderProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  const [openMobile, setOpenMobile] = React.useState(false);
  const openState = React.useSyncExternalStore(
    React.useCallback((onStoreChange) => {
      if (typeof window === "undefined") return () => {};

      const handleStorage = (event: StorageEvent) => {
        if (event.key === SIDEBAR_STORAGE_KEY) onStoreChange();
      };
      const handleCustomChange = () => onStoreChange();

      window.addEventListener("storage", handleStorage);
      window.addEventListener(SIDEBAR_STORAGE_EVENT, handleCustomChange);

      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(SIDEBAR_STORAGE_EVENT, handleCustomChange);
      };
    }, []),
    () => readSidebarOpen(defaultOpen),
    () => defaultOpen,
  );

  const open = openProp ?? openState;
  const setOpen = React.useCallback(
    (value: boolean) => {
      if (onOpenChange) onOpenChange(value);
      else {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
        window.dispatchEvent(new Event(SIDEBAR_STORAGE_EVENT));
      }
    },
    [onOpenChange],
  );

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile((value) => !value);
    else setOpen(!open);
  }, [isMobile, open, setOpen]);

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== SIDEBAR_KEYBOARD_SHORTCUT) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      toggleSidebar();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";

  return (
    <SidebarContext.Provider
      value={{ isMobile, state, open, setOpen, openMobile, setOpenMobile, toggleSidebar }}
    >
      <div
        data-slot="sidebar-provider"
        data-state={state}
        className={cn(
          "group/sidebar-wrapper flex h-svh min-h-svh w-full overflow-hidden bg-muted/30",
          className,
        )}
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

type SidebarProps = React.ComponentProps<"aside"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
};

export function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: SidebarProps) {
  const { isMobile, open, openMobile, setOpenMobile, state } = useSidebar();
  const sideClassName = side === "left" ? "left-0 border-r" : "right-0 border-l";
  const desktopWidthClassName =
    collapsible === "none"
      ? "w-[--sidebar-width]"
      : collapsible === "icon"
        ? open
          ? "w-[--sidebar-width]"
          : "w-[--sidebar-width-icon]"
        : open
          ? "w-[--sidebar-width]"
          : "w-0";

  if (isMobile) {
    return (
      <>
        {openMobile && (
          <button
            type="button"
            aria-label="Cerrar barra lateral"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setOpenMobile(false)}
          />
        )}
        <aside
          data-slot="sidebar"
          data-mobile="true"
          data-state={openMobile ? "expanded" : "collapsed"}
          data-variant={variant}
          className={cn(
            "fixed inset-y-0 z-50 flex w-[--sidebar-width-mobile] max-w-[calc(100vw-1rem)] flex-col bg-card shadow-xl transition-transform duration-200 lg:hidden",
            sideClassName,
            openMobile ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full",
            className,
          )}
          {...props}
        >
          {children}
        </aside>
      </>
    );
  }

  return (
    <aside
      data-slot="sidebar"
      data-state={state}
      data-collapsible={collapsible}
      data-variant={variant}
      className={cn(
        "relative hidden h-svh shrink-0 overflow-hidden transition-[width] duration-200 ease-linear lg:flex",
        desktopWidthClassName,
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-col border-border bg-card",
          side === "left" ? "border-r" : "border-l",
          variant === "floating" && "m-2 h-[calc(100svh-1rem)] rounded-2xl border shadow-sm",
          variant === "inset" && "m-2 h-[calc(100svh-1rem)] rounded-2xl border shadow-sm",
          collapsible === "offcanvas" && !open && "pointer-events-none opacity-0",
        )}
      >
        {children}
      </div>
    </aside>
  );
}

export function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-slot="sidebar-trigger"
      type="button"
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft className="size-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

export function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background", className)}
      {...props}
    />
  );
}

export function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-1 border-b px-3 py-4", className)}
      {...props}
    />
  );
}

export function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2", className)}
      {...props}
    />
  );
}

export function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("mt-auto border-t p-2", className)}
      {...props}
    />
  );
}

export function SidebarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

export function SidebarGroupLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn("px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground", className)}
      {...props}
    />
  );
}

export function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

export function SidebarMenuItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn("list-none", className)}
      {...props}
    />
  );
}

type SidebarMenuButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
  isActive?: boolean;
};

export function SidebarMenuButton({
  asChild = false,
  isActive = false,
  className,
  children,
  ...props
}: SidebarMenuButtonProps) {
  const buttonClassName = cn(
    "flex h-10 w-full items-center gap-2 overflow-hidden rounded-lg px-3 text-left text-sm font-medium transition-colors",
    isActive
      ? "bg-secondary text-secondary-foreground"
      : "text-foreground hover:bg-muted hover:text-foreground",
    className,
  );

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: cn(buttonClassName, child.props.className),
    });
  }

  return (
    <button
      data-slot="sidebar-menu-button"
      type="button"
      className={buttonClassName}
      {...props}
    >
      {children}
    </button>
  );
}
