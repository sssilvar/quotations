import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { AdminPanel } from "./AdminPanel";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "admin") redirect("/dashboard");

  return (
    <AppShell user={session.user}>
      <AdminPanel embedded />
    </AppShell>
  );
}
