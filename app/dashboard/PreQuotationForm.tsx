"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRef } from "react";
import { toast } from "sonner";
import { MapPin, Upload, X } from "lucide-react";
import { LocationMapPicker } from "@/components/LocationMapPicker";
import { getAddressFieldsFromReverseGeocode } from "@/lib/address";
import { getGeolocationErrorMessage, requestCurrentPosition } from "@/lib/geolocation";
import { calculateSolarCost } from "@/lib/solar-cost";
import { formatCurrency } from "@/lib/quotation-finance";

type Props = {
  onCreated: (createdId?: string) => void;
  onCancel: () => void;
};

const numFields = [
  { key: "consumoKwh", label: "Consumo", unit: "kWh/mes", placeholder: "800" },
  { key: "tarifaKwh", label: "Tarifa kWh", unit: "$", placeholder: "821" },
  { key: "contribucion", label: "Contribución", unit: "%", placeholder: "20" },
  { key: "alumbrado", label: "Alu. Público", unit: "%", placeholder: "15" },
  { key: "autoconsumo", label: "% Autoconsumo", unit: "%", placeholder: "60" },
  { key: "hbs", label: "HBS", unit: "h/día", placeholder: "3.8" },
  { key: "generacion", label: "Generación Planta", unit: "kWh/mes", placeholder: "1000" },
  { key: "adicionales", label: "Adicionales", unit: "$", placeholder: "0" },
  { key: "descuento", label: "% Descuento", unit: "%", placeholder: "0" },
] as const;

const financeFields = [
  { key: "ahorroMes", label: "Ahorro mensual estimado", unit: "$", placeholder: "350000" },
] as const;

const DEFAULT_COUNTRY = "Colombia";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_MB = 10;

export function PreQuotationForm({ onCreated, onCancel }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Record<string, string>>({ country: DEFAULT_COUNTRY });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; shareableId: string } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const costBreakdown = calculateSolarCost({
    generacion: form.generacion ? Number(form.generacion) : null,
    hbs: form.hbs ? Number(form.hbs) : null,
    adicionales: form.adicionales ? Number(form.adicionales) : null,
    descuento: form.descuento ? Number(form.descuento) : null,
  });

  function handleImageChange(f: File | null) {
    if (!f) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Máximo ${MAX_IMAGE_MB}MB`);
      return;
    }
    if (!IMAGE_TYPES.includes(f.type)) {
      toast.error("JPG, PNG, GIF o WebP");
      return;
    }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": "es" } }
      );
      const data = await res.json();
      const updates = getAddressFieldsFromReverseGeocode(data);
      setForm((f) => ({ ...f, ...updates }));
    } catch { /* ignore */ }
  }

  async function useMyLocation() {
    setGettingLocation(true);
    try {
      const pos = await requestCurrentPosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setForm((f) => ({ ...f, latitude: String(lat), longitude: String(lng) }));
      await reverseGeocode(lat, lng);
      toast.success("Ubicación obtenida");
    } catch (error) {
      toast.error(getGeolocationErrorMessage(error));
    } finally {
      setGettingLocation(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName?.trim()) {
      setError("Nombre del cliente requerido");
      return;
    }
    if (!form.generacion || Number(form.generacion) <= 0) {
      setError("Generación planta requerida para calcular el costo");
      return;
    }
    if (!form.ahorroMes || Number(form.ahorroMes) <= 0) {
      setError("Ahorro mensual estimado requerido");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setLoading(false);
      setError("Error al guardar");
      return;
    }
    const q = await res.json();
    if (imageFile) {
      const fd = new FormData();
      fd.append("image", imageFile);
      const up = await fetch(`/api/quotations/${q.id}/upload`, { method: "POST", body: fd });
      if (!up.ok) toast.error("Cotización creada pero falló subir imagen");
    }
    setLoading(false);
    setCreated({ id: q.id, shareableId: q.shareableId });
    toast.success("Cotización creada");
  }

  function copyLink() {
    if (!created || typeof window === "undefined") return;
    navigator.clipboard.writeText(`${window.location.origin}/q/${created.shareableId}`);
    toast.success("Enlace copiado");
  }

  if (created) {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/q/${created.shareableId}`
        : `/q/${created.shareableId}`;
    return (
      <div className="mx-auto max-w-xl">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-medium text-emerald-800">Cotización creada</p>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {shareUrl}
              </span>
              <Button size="sm" onClick={copyLink}>
                Copiar
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setCreated(null);
                  onCreated(created.id);
                }}
              >
                Ver detalle
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCreated(null);
                  setForm({ country: DEFAULT_COUNTRY });
                  setImageFile(null);
                  setImagePreview(null);
                  onCreated();
                }}
              >
                Nueva pre-cotización
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Nueva pre-cotización</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Datos del cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="pq-clientName">Nombre *</Label>
              <Input
                id="pq-clientName"
                name="clientName"
                required
                value={form.clientName ?? ""}
                onChange={(e) => set("clientName", e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pq-clientEmail">Email</Label>
              <Input
                id="pq-clientEmail"
                name="clientEmail"
                type="email"
                value={form.clientEmail ?? ""}
                onChange={(e) => set("clientEmail", e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pq-clientPhone">Teléfono</Label>
              <Input
                id="pq-clientPhone"
                name="clientPhone"
                value={form.clientPhone ?? ""}
                onChange={(e) => set("clientPhone", e.target.value)}
                placeholder="+57 3XX"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pq-country">País</Label>
              <Input
                id="pq-country"
                name="country"
                value={form.country ?? DEFAULT_COUNTRY}
                onChange={(e) => set("country", e.target.value)}
                placeholder="Colombia"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pq-state">Departamento</Label>
              <Input
                id="pq-state"
                name="state"
                value={form.state ?? ""}
                onChange={(e) => set("state", e.target.value)}
                placeholder="Ej. Antioquia"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pq-city">Ciudad</Label>
              <Input
                id="pq-city"
                name="city"
                value={form.city ?? ""}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Ej. Medellín"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="pq-clientAddress">Dirección (detalle)</Label>
              <Input
                id="pq-clientAddress"
                name="clientAddress"
                value={form.clientAddress ?? ""}
                onChange={(e) => set("clientAddress", e.target.value)}
                placeholder="Calle, número, barrio"
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={gettingLocation}>
                <MapPin className="mr-1 size-4" />
                {gettingLocation ? "Obteniendo…" : "Usar mi ubicación"}
              </Button>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs text-muted-foreground">
                Haz clic en el mapa o arrastra el pin para ajustar la ubicación.
              </p>
              <LocationMapPicker
                lat={form.latitude ? Number(form.latitude) : null}
                lng={form.longitude ? Number(form.longitude) : null}
                height={220}
                onLocationChange={async (lat, lng) => {
                  setForm((f) => ({ ...f, latitude: String(lat), longitude: String(lng) }));
                  await reverseGeocode(lat, lng);
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Parámetros del sistema</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {numFields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`pq-${f.key}`}>
                  {f.label}{" "}
                  <span className="text-muted-foreground">({f.unit})</span>
                </Label>
                <Input
                  id={`pq-${f.key}`}
                  name={f.key}
                  type="number"
                  step="any"
                  value={form[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Proyección financiera</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted px-4 py-3 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Costo total calculado</p>
              <p className="mt-1 text-base font-semibold">
                {costBreakdown ? formatCurrency(costBreakdown.finalCost) : "Completa generación para calcular"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {costBreakdown
                  ? `${costBreakdown.panelCount} paneles · base ${formatCurrency(costBreakdown.baseCost)}`
                  : "El costo se calcula desde la tabla de precios usando generación, HBS, adicionales y descuento."}
              </p>
            </div>
            {financeFields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`pq-${f.key}`}>
                  {f.label} * <span className="text-muted-foreground">({f.unit})</span>
                </Label>
                <Input
                  id={`pq-${f.key}`}
                  name={f.key}
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={form[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="pq-notes"
              name="notes"
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Observaciones adicionales…"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Imagen de visita técnica (opcional)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Si ya realizaste la visita, sube la foto y la cotización quedará con imagen. Si no, puedes agregarla después.
            </p>
          </CardHeader>
          <CardContent>
            {imagePreview ? (
              <div className="space-y-2">
                <img src={imagePreview} alt="Vista previa" className="max-h-40 rounded-lg object-contain" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleImageChange(null)}
                >
                  <X className="mr-1 size-3.5" /> Quitar imagen
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 py-6 text-sm text-muted-foreground hover:bg-muted/60"
              >
                <Upload className="size-4" />
                Añadir imagen (JPG, PNG, GIF, WebP · máx. {MAX_IMAGE_MB}MB)
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
            />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Guardando…" : "Crear pre-cotización"}
        </Button>
      </form>
    </div>
  );
}
