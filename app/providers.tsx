"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegistration } from "@/components/PwaRegistration";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        <PwaRegistration />
        {children}
        <Toaster richColors position="bottom-right" />
      </TooltipProvider>
    </SessionProvider>
  );
}
