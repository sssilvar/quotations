"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Settings } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { UserSettingsDialog, type EditableUser } from "@/components/UserSettingsDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function getDisplayName(user: EditableUser) {
  return [user.name, user.lastName].filter(Boolean).join(" ") || user.username;
}

export function AccountMenu({
  user,
  compact = false,
  onUserUpdated,
}: {
  user: EditableUser & { role?: string };
  compact?: boolean;
  onUserUpdated?: (user: EditableUser) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "h-auto w-full rounded-xl p-2",
                compact ? "justify-center px-0" : "justify-start gap-3",
              )}
              aria-label="Cuenta"
            />
          }
        >
          <UserAvatar
            name={getDisplayName(user)}
            username={user.username}
            image={user.image}
            className="size-9"
          />
          {!compact && (
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium">{getDisplayName(user)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.role === "admin" ? "Administrador" : "Ingeniero"}
              </p>
            </div>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-3">
              <UserAvatar
                name={getDisplayName(user)}
                username={user.username}
                image={user.image}
              />
              <div className="min-w-0">
                <p className="truncate font-medium">{getDisplayName(user)}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">
                  {user.email || user.username}
                </p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings className="size-4" />
            Mi cuenta
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} variant="destructive">
            <LogOut className="size-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Mi cuenta"
        description="Actualiza tu perfil, contraseña y avatar."
        mode="self"
        initialUser={user}
        onSaved={onUserUpdated}
      />
    </>
  );
}
