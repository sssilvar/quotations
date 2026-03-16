"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export function EditInDashboard({
  quotationId,
  userId,
}: {
  quotationId: string;
  userId: string;
}) {
  const { data: session, status } = useSession();
  if (status !== "authenticated" || !session?.user) return null;
  const canEdit = session.user.id === userId || session.user.role === "admin";
  if (!canEdit) return null;

  return (
    <Link
      href={`/dashboard/${quotationId}`}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      <Pencil className="mr-1 size-3.5" />
      Editar en panel
    </Link>
  );
}
