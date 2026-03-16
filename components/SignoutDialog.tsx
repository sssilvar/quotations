"use client";

import { signOut } from "next-auth/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignoutDialog({ compact = false }: { compact?: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size={compact ? "icon-sm" : "sm"} className={compact ? "" : "w-full justify-start"} />}>
        <LogOut className={compact ? "size-4" : "mr-1 size-4"} /> {!compact && "Cerrar sesión"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cerrar sesión</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas cerrar sesión?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => signOut({ callbackUrl: "/login" })}>
            Cerrar sesión
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
