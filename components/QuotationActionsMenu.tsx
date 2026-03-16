"use client";
import { toast } from "sonner";
import { Copy, ExternalLink, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function QuotationActionsMenu({
  shareableId,
  compact = false,
}: {
  shareableId: string;
  compact?: boolean;
}) {
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/q/${shareableId}`
      : `/q/${shareableId}`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Enlace copiado");
  }

  function openPrintView() {
    window.open(`/q/${shareableId}/export?print=1`, "_blank", "noopener,noreferrer");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size={compact ? "icon-sm" : "sm"}
            className={compact ? "rounded-full" : undefined}
            aria-label="Compartir y exportar"
            title="Compartir y exportar"
          />
        }
      >
        <Share2 className="size-4" />
        {!compact && <span>Compartir</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={copyLink}>
          <Copy className="size-4" />
          Copiar enlace
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(`/q/${shareableId}`, "_blank", "noopener,noreferrer")}>
          <ExternalLink className="size-4" />
          Abrir compartida
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openPrintView}>
          <Printer className="size-4" />
          Imprimir / PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
