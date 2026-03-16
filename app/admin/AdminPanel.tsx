"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { UserAvatar } from "@/components/UserAvatar";
import { UserSettingsDialog, type EditableUser } from "@/components/UserSettingsDialog";
import {
  ExternalLink,
  UserPlus,
  TrendingUp,
  BarChart3,
  Users,
} from "lucide-react";
import { AdminMap } from "./AdminMap";

type UserStat = {
  id: string;
  username: string;
  name?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  image?: string | null;
  role: string;
  createdAt: string;
  total: number;
  official: number;
  pending: number;
};

type QuotationSummary = {
  id: string;
  shareableId: string;
  clientName: string;
  isOfficial: boolean;
  createdAt: string;
  latitude?: number | null;
  longitude?: number | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  userId: string;
  user: { username: string; name?: string | null; lastName?: string | null; email?: string | null };
};

type Data = { stats: UserStat[]; quotations: QuotationSummary[] };

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

export function AdminPanel({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<EditableUser | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const userColorMap = useMemo(() => {
    if (!data) return {};
    const m: Record<string, string> = {};
    data.stats.forEach((u, i) => { m[u.id] = COLORS[i % COLORS.length]; });
    return m;
  }, [data]);

  function openQuotation(id: string) {
    router.push(`/dashboard/${id}`, { scroll: false });
  }

  if (loading) return <p className="p-6 text-muted-foreground">Cargando…</p>;
  if (!data) return <p className="p-6 text-destructive">Error al cargar datos.</p>;

  const filteredQ = search.trim()
    ? data.quotations.filter((q) =>
        q.clientName.toLowerCase().includes(search.trim().toLowerCase()) ||
        q.user.username.toLowerCase().includes(search.trim().toLowerCase())
      )
    : data.quotations;

  const totalQuotations = data.quotations.length;
  const totalOfficial = data.quotations.filter((q) => q.isOfficial).length;
  const conversionRate = totalQuotations > 0 ? Math.round((totalOfficial / totalQuotations) * 100) : 0;
  const geoQuotations = data.quotations.filter((q) => q.latitude != null && q.longitude != null);
  const performanceRows = data.stats.map((u) => ({
    ...u,
    conversion: u.total > 0 ? Math.round((u.official / u.total) * 100) : 0,
  }));
  const performanceColumns: DataTableColumn<(typeof performanceRows)[number]>[] = [
    {
      id: "dot",
      header: "",
      cell: (row) => <div className="size-3 rounded-full" style={{ backgroundColor: userColorMap[row.id] }} />,
      headerClassName: "w-10",
      className: "w-10",
    },
    {
      id: "engineer",
      header: "Ingeniero",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <UserAvatar
            name={[row.name, row.lastName].filter(Boolean).join(" ") || row.username}
            username={row.username}
            image={row.image}
            className="size-8"
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{row.username}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[row.name, row.lastName].filter(Boolean).join(" ") || "Sin nombre"}
            </p>
          </div>
        </div>
      ),
      sortValue: (row) => row.username,
    },
    {
      id: "total",
      header: "Total",
      cell: (row) => <span className="text-center">{row.total}</span>,
      sortValue: (row) => row.total,
      className: "text-center",
      headerClassName: "text-center",
    },
    {
      id: "pending",
      header: "Pre-cot.",
      cell: (row) => <span className="text-amber-600">{row.pending}</span>,
      sortValue: (row) => row.pending,
      className: "text-center",
      headerClassName: "text-center",
    },
    {
      id: "official",
      header: "Oficiales",
      cell: (row) => <span className="text-emerald-600">{row.official}</span>,
      sortValue: (row) => row.official,
      className: "text-center",
      headerClassName: "text-center",
    },
    {
      id: "conversion",
      header: "Tasa conv.",
      cell: (row) => <span>{row.total > 0 ? `${row.conversion}%` : "—"}</span>,
      sortValue: (row) => row.conversion,
      className: "text-center",
      headerClassName: "text-center",
    },
  ];
  const userColumns: DataTableColumn<UserStat>[] = [
    {
      id: "username",
      header: "Usuario",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <UserAvatar
            name={[row.name, row.lastName].filter(Boolean).join(" ") || row.username}
            username={row.username}
            image={row.image}
            className="size-8"
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{row.username}</p>
            <p className="truncate text-xs text-muted-foreground">
              {new Date(row.createdAt).toLocaleDateString("es-CO")}
            </p>
          </div>
        </div>
      ),
      sortValue: (row) => row.username,
    },
    {
      id: "identity",
      header: "Nombre / Email",
      cell: (row) => (
        <div className="text-sm text-muted-foreground">
          {[row.name, row.lastName].filter(Boolean).join(" ") || "—"}
          {row.email && <span className="block text-xs">{row.email}</span>}
        </div>
      ),
      sortValue: (row) => [row.name, row.lastName, row.email].filter(Boolean).join(" "),
    },
    {
      id: "role",
      header: "Rol",
      cell: (row) => (
        <Badge variant={row.role === "admin" ? "default" : "secondary"}>
          {row.role === "admin" ? "Admin" : "Ingeniero"}
        </Badge>
      ),
      sortValue: (row) => row.role,
    },
    {
      id: "quotations",
      header: "Cotiz.",
      cell: (row) => <span>{row.total}</span>,
      sortValue: (row) => row.total,
      className: "text-center",
      headerClassName: "text-center",
    },
    {
      id: "actions",
      header: "Acciones",
      cell: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditingUser(row)}
        >
          Editar
        </Button>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      {!embedded && (
        <header className="-mx-6 -mt-2 border-b bg-card px-6 py-4">
          <h1 className="text-xl font-bold text-emerald-700">Soinsolar &mdash; Admin</h1>
          <p className="text-xs text-muted-foreground">Panel de administración</p>
        </header>
      )}
      <div className="mx-auto max-w-5xl">
        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <StatCard label="Equipo técnico" value={data.stats.length} icon={<Users className="size-5 text-muted-foreground" />} />
          <StatCard label="Total cotizaciones" value={totalQuotations} icon={<BarChart3 className="size-5 text-muted-foreground" />} />
          <StatCard label="Oficiales" value={totalOfficial} icon={<TrendingUp className="size-5 text-emerald-600" />} />
          <StatCard label="Tasa conversión" value={`${conversionRate}%`} icon={<TrendingUp className="size-5 text-amber-500" />} />
        </div>

        <Tabs defaultValue="performance">
          <TabsList>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
            <TabsTrigger value="quotations">Cotizaciones</TabsTrigger>
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          </TabsList>

          {/* Performance tab */}
          <TabsContent value="performance">
            <div className="space-y-6">
              <DataTable
                columns={performanceColumns}
                data={performanceRows}
                rowKey={(row) => row.id}
                initialSort={{ columnId: "total", direction: "desc" }}
                pageSize={8}
              />

              {/* Aggregated map */}
              {geoQuotations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">
                      Ubicaciones de cotizaciones ({geoQuotations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AdminMap quotations={geoQuotations} userColorMap={userColorMap} />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Quotations tab */}
          <TabsContent value="quotations">
            <div className="mb-4">
              <Input
                type="search"
                placeholder="Buscar por cliente o ingeniero…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              {filteredQ.map((q) => (
                <div
                  key={q.id}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm transition-colors hover:border-emerald-300"
                  onClick={() => openQuotation(q.id)}
                >
                  <div
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: userColorMap[q.userId] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{q.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {[q.user.name, q.user.lastName].filter(Boolean).join(" ") || q.user.email || q.user.username} &middot;{" "}
                      {new Date(q.createdAt).toLocaleDateString("es-CO")}
                      {q.city && ` · ${q.city}`}
                    </p>
                  </div>
                  <Badge variant={q.isOfficial ? "default" : "secondary"}>
                    {q.isOfficial ? "Oficial" : "Pre-cot."}
                  </Badge>
                  <Link
                    href={`/q/${q.shareableId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon-xs">
                      <ExternalLink className="size-3.5" />
                    </Button>
                  </Link>
                </div>
              ))}
              {!filteredQ.length && (
                <p className="py-8 text-center text-muted-foreground">Sin resultados.</p>
              )}
            </div>
          </TabsContent>

          {/* Users tab (last) */}
          <TabsContent value="usuarios">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Crear y gestionar usuarios, permisos y acceso</span>
              <Button onClick={() => setCreateOpen(true)}>
                <UserPlus className="mr-1 size-4" /> Crear usuario
              </Button>
            </div>
            <DataTable
              columns={userColumns}
              data={data.stats}
              rowKey={(row) => row.id}
              initialSort={{ columnId: "username", direction: "asc" }}
              pageSize={8}
            />
          </TabsContent>
        </Tabs>
      </div>

      <UserSettingsDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Crear usuario"
        description="Define acceso, perfil y contraseña inicial."
        mode="create"
        onSaved={() => fetchData()}
      />
      <UserSettingsDialog
        open={editingUser != null}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
        title="Editar usuario"
        description="Actualiza el perfil, el rol, el avatar o la contraseña."
        mode="admin"
        initialUser={editingUser ?? undefined}
        onSaved={() => {
          setEditingUser(null);
          fetchData();
        }}
      />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-4">
        {icon}
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
