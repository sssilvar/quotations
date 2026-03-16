"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

export type EditableUser = {
  id?: string;
  username?: string | null;
  name?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  image?: string | null;
  role?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  mode: "self" | "admin" | "create";
  initialUser?: EditableUser;
  onSaved?: (user: EditableUser) => void;
};

type FormProps = Omit<Props, "open" | "onOpenChange"> & {
  onOpenChange: (open: boolean) => void;
};

function UserSettingsForm({
  onOpenChange,
  mode,
  initialUser,
  onSaved,
}: FormProps) {
  const initialValues = {
    username: initialUser?.username ?? "",
    name: initialUser?.name ?? "",
    lastName: initialUser?.lastName ?? "",
    email: initialUser?.email ?? "",
    avatarUrl: initialUser?.avatarUrl ?? "",
    role: (initialUser?.role as "admin" | "engineer" | undefined) ?? "engineer",
  };
  const [username, setUsername] = useState(initialValues.username);
  const [name, setName] = useState(initialValues.name);
  const [lastName, setLastName] = useState(initialValues.lastName);
  const [email, setEmail] = useState(initialValues.email);
  const [avatarUrl, setAvatarUrl] = useState(initialValues.avatarUrl);
  const [role, setRole] = useState<"admin" | "engineer">(initialValues.role);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const canEditIdentityFields = mode !== "self" || initialUser?.role === "admin";

  const previewImage = useMemo(
    () => avatarUrl.trim() || initialUser?.image || null,
    [avatarUrl, initialUser?.image],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    const endpoint =
      mode === "self" ? "/api/account" : mode === "create" ? "/api/admin/users" : `/api/admin/users/${initialUser?.id}`;

    const body =
      mode === "create"
        ? {
            username,
            name,
            lastName,
            email,
            avatarUrl,
            role,
            password,
          }
        : mode === "self"
          ? {
              username,
              name,
              lastName,
              email,
              avatarUrl,
              currentPassword,
              newPassword: password,
            }
          : {
              username,
              name,
              lastName,
              email,
              avatarUrl,
              role,
              password,
            };

    const res = await fetch(endpoint, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "No se pudo guardar");
      return;
    }

    toast.success(mode === "create" ? "Usuario creado" : "Cambios guardados");
    onSaved?.(json);
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
        <UserAvatar
          name={[name, lastName].filter(Boolean).join(" ") || username}
          username={username}
          image={previewImage}
          className="size-14 text-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{[name, lastName].filter(Boolean).join(" ") || username || "Nuevo usuario"}</p>
          <p className="truncate text-xs text-muted-foreground">{email || "Sin email"}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="user-settings-username">Usuario</Label>
          <Input
            id="user-settings-username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={!canEditIdentityFields}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-settings-email">Email</Label>
          <Input
            id="user-settings-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={!canEditIdentityFields}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-settings-name">Nombre</Label>
          <Input
            id="user-settings-name"
            name="name"
            autoComplete="given-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!canEditIdentityFields}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-settings-last-name">Apellido</Label>
          <Input
            id="user-settings-last-name"
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            disabled={!canEditIdentityFields}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="user-settings-avatar-url">Avatar URL</Label>
          <Input
            id="user-settings-avatar-url"
            name="avatarUrl"
            autoComplete="url"
            placeholder="https://..."
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Si lo dejas vacío, se usará un avatar con iniciales.
          </p>
        </div>
        {!canEditIdentityFields && (
          <p className="text-xs text-muted-foreground md:col-span-2">
            Solo los administradores pueden cambiar nombre, usuario, apellido y email desde su propia cuenta.
          </p>
        )}
        {mode !== "self" && (
          <div className="space-y-2">
            <Label htmlFor="user-settings-role">Rol</Label>
            <select
              id="user-settings-role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as "admin" | "engineer")}
              className={cn(
                "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <option value="engineer">Ingeniero</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-xl border p-4">
        <div>
          <h3 className="font-medium">Seguridad</h3>
          <p className="text-xs text-muted-foreground">
            {mode === "self"
              ? "Cambia tu contraseña cuando lo necesites."
              : "Puedes establecer una nueva contraseña para este usuario."}
          </p>
        </div>
        <div className={cn("grid gap-4", mode === "self" ? "md:grid-cols-2" : "md:grid-cols-1")}>
          {mode === "self" && (
            <div className="space-y-2">
              <Label htmlFor="user-settings-current-password">Contraseña actual</Label>
              <Input
                id="user-settings-current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="user-settings-password">
              {mode === "create" ? "Contraseña" : "Nueva contraseña"}
            </Label>
            <Input
              id="user-settings-password"
              name="password"
              type="password"
              autoComplete={mode === "self" ? "new-password" : "off"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required={mode === "create"}
            />
          </div>
        </div>
      </div>

      <DialogFooter className="bg-transparent p-0">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : mode === "create" ? "Crear usuario" : "Guardar cambios"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function UserSettingsDialog({
  open,
  onOpenChange,
  title,
  description,
  mode,
  initialUser,
  onSaved,
}: Props) {
  const formKey = `${mode}:${initialUser?.id ?? "new"}:${open ? "open" : "closed"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {open && (
          <UserSettingsForm
            key={formKey}
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            mode={mode}
            initialUser={initialUser}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
