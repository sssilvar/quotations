"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

type Props = { quotationId: string; onUploaded: () => void };

export function ImageUploader({ quotationId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  function handleFile(f: File | null) {
    setError("");
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError("Máximo 10MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(f.type)) {
      setError("Tipo no permitido");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch(`/api/quotations/${quotationId}/upload`, {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    if (!res.ok) {
      setError("Error al subir");
      return;
    }
    toast.success("Imagen subida");
    onUploaded();
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative">
          <img src={preview} alt="preview" className="max-h-60 rounded-lg object-contain" />
          <Button
            variant="secondary"
            size="icon-xs"
            className="absolute right-2 top-2"
            onClick={() => {
              setPreview(null);
              setFile(null);
            }}
          >
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 py-8 text-sm text-muted-foreground hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
        >
          <Upload className="size-4" />
          JPG, PNG, GIF, WebP (max 10MB)
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {preview && (
        <Button className="w-full" onClick={upload} disabled={uploading}>
          {uploading ? "Subiendo…" : "Subir imagen"}
        </Button>
      )}
    </div>
  );
}
