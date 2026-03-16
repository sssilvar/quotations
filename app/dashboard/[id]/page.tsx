import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { DashboardShell } from "../DashboardShell";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DashboardQuotationPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/dashboard");

  const { id } = await params;

  return (
    <AppShell user={session.user}>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <DashboardShell mode={{ kind: "detail", selectedId: id }} />
      </Suspense>
    </AppShell>
  );
}
