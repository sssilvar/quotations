import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/40">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
