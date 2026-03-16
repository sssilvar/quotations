"use client";

import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowDown, ArrowUp, ArrowUpDown, Link2, Check } from "lucide-react";

type Quotation = {
  id: string;
  shareableId: string;
  clientName: string;
  isOfficial: boolean;
  createdAt: string;
  user?: { username: string };
};

export function QuotationList({ onSelect }: { onSelect: (id: string) => void }) {
  const [list, setList] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pre" | "official">("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"client" | "status" | "date">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetch("/api/quotations")
      .then((r) => r.json())
      .then(setList)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let out = list;
    if (filter === "pre") out = out.filter((q) => !q.isOfficial);
    if (filter === "official") out = out.filter((q) => q.isOfficial);
    const s = search.trim().toLowerCase();
    if (s) out = out.filter((q) => q.clientName.toLowerCase().includes(s));
    return [...out].sort((a, b) => {
      const direction = sortDir === "asc" ? 1 : -1;
      if (sortBy === "client") return a.clientName.localeCompare(b.clientName) * direction;
      if (sortBy === "status") return (Number(a.isOfficial) - Number(b.isOfficial)) * direction;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
    });
  }, [filter, list, search, sortBy, sortDir]);

  function copyLink(q: Quotation, e: React.MouseEvent) {
    e.stopPropagation();
    const url = typeof window !== "undefined" ? `${window.location.origin}/q/${q.shareableId}` : "";
    if (url) navigator.clipboard.writeText(url);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleSort(next: "client" | "status" | "date") {
    if (sortBy === next) {
      setSortDir((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(next);
    setSortDir(next === "date" ? "desc" : "asc");
  }

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;

  const filters: { value: typeof filter; label: string }[] = [
    { value: "all", label: "Todas" },
    { value: "pre", label: "Pre" },
    { value: "official", label: "Oficiales" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Cotizaciones</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente…"
            className="w-44"
          />
          <div className="flex rounded-lg border bg-card p-0.5 text-xs">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  filter === f.value
                    ? "bg-emerald-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!filtered.length ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            {search.trim() ? "Sin resultados." : "No hay cotizaciones."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton active={sortBy === "client"} direction={sortBy === "client" ? sortDir : null} onClick={() => toggleSort("client")}>
                    Cliente
                  </SortButton>
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <SortButton active={sortBy === "status"} direction={sortBy === "status" ? sortDir : null} onClick={() => toggleSort("status")}>
                    Estado
                  </SortButton>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <SortButton active={sortBy === "date"} direction={sortBy === "date" ? sortDir : null} onClick={() => toggleSort("date")}>
                    Fecha
                  </SortButton>
                </TableHead>
                <TableHead className="w-12 text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((q) => (
                <TableRow
                  key={q.id}
                  onClick={() => onSelect(q.id)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <p className="font-medium">{q.clientName}</p>
                    {q.user?.username && (
                      <p className="text-xs text-muted-foreground sm:hidden">
                        {q.user.username}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={q.isOfficial ? "default" : "secondary"}>
                      {q.isOfficial ? "Oficial" : "Pre"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {new Date(q.createdAt).toLocaleDateString("es-CO")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => copyLink(q, e)}
                          />
                        }
                      >
                        {copiedId === q.id ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Link2 className="size-3.5" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>Copiar enlace</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function SortButton({
  active,
  direction,
  onClick,
  children,
}: {
  active: boolean;
  direction: "asc" | "desc" | null;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button type="button" className="inline-flex items-center gap-1" onClick={onClick}>
      <span>{children}</span>
      <Icon className="size-3.5" />
    </button>
  );
}
