import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { DashboardShell } from "../DashboardShell";

export default async function DashboardNewPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/dashboard/new");

  return (
    <AppShell user={session.user}>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <DashboardShell mode={{ kind: "new" }} />
      </Suspense>
    </AppShell>
  );
}
