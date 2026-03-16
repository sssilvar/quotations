"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PreQuotationForm } from "./PreQuotationForm";
import { QuotationList } from "./QuotationList";
import { QuotationDetail } from "./QuotationDetail";

type DashboardMode =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "detail"; selectedId: string; editing?: boolean };

export function DashboardShell({
  mode,
}: {
  mode: DashboardMode;
}) {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  function openQuotation(id: string) {
    router.push(`/dashboard/${id}`, { scroll: false });
  }

  function closeQuotation() {
    router.replace("/dashboard", { scroll: false });
  }

  function onCreated(openId?: string) {
    setRefreshKey((k) => k + 1);
    if (openId) router.push(`/dashboard/${openId}`, { scroll: false });
    else router.replace("/dashboard/new", { scroll: false });
  }

  return (
    <>
      {mode.kind === "new" ? (
        <PreQuotationForm
          onCreated={onCreated}
          onCancel={() => router.replace("/dashboard", { scroll: false })}
        />
      ) : mode.kind === "detail" ? (
        <QuotationDetail
          id={mode.selectedId}
          initialEditing={mode.editing}
          onBack={closeQuotation}
          onUpdated={() => setRefreshKey((k) => k + 1)}
        />
      ) : (
        <QuotationList key={refreshKey} onSelect={openQuotation} />
      )}
    </>
  );
}
