"use client";

import { useEffect } from "react";

export function AutoPrintOnLoad() {
  useEffect(() => {
    const start = window.performance.now();
    let timer = 0;

    const tryPrint = () => {
      const chartReady = document.querySelector("[data-quotation-chart-ready='true']");
      const timedOut = window.performance.now() - start > 2500;

      if (chartReady || timedOut) {
        window.print();
        return;
      }

      timer = window.setTimeout(tryPrint, 100);
    };

    timer = window.setTimeout(tryPrint, 150);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
