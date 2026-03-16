"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (!window.isSecureContext && window.location.hostname !== "localhost") return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Ignore registration failures; installability is progressive.
      }
    };

    void register();
  }, []);

  return null;
}
