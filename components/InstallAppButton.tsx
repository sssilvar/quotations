"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallAppButton({ compact = false }: { compact?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [isSecureContext] = useState(() => (typeof window !== "undefined" ? window.isSecureContext : false));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const isAndroid = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Android/i.test(navigator.userAgent);
  }, []);

  const isChromeLike = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Chrome|CriOS|EdgA/i.test(navigator.userAgent);
  }, []);

  if (installed || !isAndroid || !isSecureContext) return null;

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
      return;
    }

    toast.message("Instalar app", {
      description: isChromeLike
        ? "Abre el menu del navegador y elige Instalar app."
        : "Abre el menu del navegador y elige Agregar a pantalla principal o Instalar app.",
    });
  }

  const button = (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      className={compact ? "w-full" : "w-full justify-start"}
      onClick={handleInstall}
      title="Instalar app"
    >
      <Download className="size-4 shrink-0" />
      {!compact && <span>Instalar app</span>}
    </Button>
  );

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger render={button} />
        <TooltipContent side="right">Instalar app</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
