"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
};

type Props<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  initialSort?: { columnId: string; direction: "asc" | "desc" };
  pageSize?: number;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({
  columns,
  data,
  initialSort,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  emptyMessage = "Sin resultados.",
  rowKey,
  onRowClick,
}: Props<T>) {
  const [sort, setSort] = useState<{ columnId: string; direction: "asc" | "desc" } | null>(initialSort ?? null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const column = columns.find((item) => item.id === sort.columnId);
    if (!column?.sortValue) return data;
    return [...data].sort((a, b) => {
      const aValue = column.sortValue?.(a);
      const bValue = column.sortValue?.(b);
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sort.direction === "asc" ? aValue - bValue : bValue - aValue;
      }
      return sort.direction === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [columns, data, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const page = Math.min(currentPage, totalPages);
  const paged = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortValue) return;
    setCurrentPage(1);
    setSort((current) => {
      if (!current || current.columnId !== column.id) {
        return { columnId: column.id, direction: "asc" };
      }
      return {
        columnId: column.id,
        direction: current.direction === "asc" ? "desc" : "asc",
      };
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.id} className={column.headerClassName}>
                  {column.sortValue ? (
                    <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(column)}>
                      <span>{column.header}</span>
                      <SortIcon active={sort?.columnId === column.id} direction={sort?.columnId === column.id ? sort.direction : null} />
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length ? (
              paged.map((row, index) => (
                <TableRow
                  key={rowKey(row, index)}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <TableCell key={column.id} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {sorted.length ? `${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, sorted.length)} de ${sorted.length}` : "0 resultados"}
        </p>
        <div className="flex items-center gap-2">
          <select
            value={rowsPerPage}
            onChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setCurrentPage(1);
            }}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option} / pág.</option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>
            Anterior
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" | null }) {
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return <Icon className="size-3.5" />;
}
