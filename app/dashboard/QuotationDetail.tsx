"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageAnnotationViewer } from "./ImageAnnotationViewer";
import { ImageUploader } from "./ImageUploader";
import { ImageEditor, type ImageEditorRef } from "./ImageEditor";
import { QuotationFinancialProjection } from "@/components/QuotationFinancialProjection";
import { QuotationActionsMenu } from "@/components/QuotationActionsMenu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  ArrowLeft,
  Trash2,
  MapPin,
  ExternalLink,
  Pencil,
  X,
  Save,
} from "lucide-react";
import { LocationMapPicker } from "@/components/LocationMapPicker";
import { getAddressFieldsFromReverseGeocode } from "@/lib/address";
import { getGeolocationErrorMessage, requestCurrentPosition } from "@/lib/geolocation";
import { calculateSolarCost } from "@/lib/solar-cost";

type Q = {
  id: string;
  shareableId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  country?: string;
  state?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  consumoKwh?: number;
  tarifaKwh?: number;
  contribucion?: number;
  alumbrado?: number;
  autoconsumo?: number;
  hbs?: number;
  generacion?: number;
  adicionales?: number;
  descuento?: number;
  ahorroMes?: number;
  costoTotal?: number;
  isOfficial: boolean;
  imagePath?: string;
  visitNotes?: string;
  annotationData?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user?: { username: string; name?: string | null; lastName?: string | null; email?: string | null };
};

type Props = { id: string; initialEditing?: boolean; onBack: () => void; onUpdated: () => void };

const CLIENT_FIELDS = [
  { key: "clientName", label: "Nombre" },
  { key: "clientEmail", label: "Email" },
  { key: "clientPhone", label: "Teléfono" },
  { key: "clientAddress", label: "Dirección" },
  { key: "country", label: "País" },
  { key: "state", label: "Departamento" },
  { key: "city", label: "Ciudad" },
] as const;

const EDITABLE_FIELDS = CLIENT_FIELDS.map((f) => f.key);

const NUM_FIELDS = [
  { key: "consumoKwh", label: "Consumo", unit: "kWh/mes" },
  { key: "tarifaKwh", label: "Tarifa", unit: "$" },
  { key: "contribucion", label: "Contribución", unit: "%" },
  { key: "alumbrado", label: "Alu. Público", unit: "%" },
  { key: "autoconsumo", label: "Autoconsumo", unit: "%" },
  { key: "hbs", label: "HBS", unit: "h/día" },
  { key: "generacion", label: "Generación", unit: "kWh/mes" },
  { key: "adicionales", label: "Adicionales", unit: "$" },
  { key: "descuento", label: "Descuento", unit: "%" },
] as const;

const FINANCE_FIELDS = [
  { key: "ahorroMes", label: "Ahorro mensual estimado", unit: "$" },
] as const;

export function QuotationDetail({ id, initialEditing = false, onBack, onUpdated }: Props) {
  const router = useRouter();
  const editorRef = useRef<ImageEditorRef>(null);
  const [q, setQ] = useState<Q | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string | number | null>>({});
  const [promoting, setPromoting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [geoConfirmOpen, setGeoConfirmOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/quotations/${id}`)
      .then((r) => r.json())
      .then(setQ)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (q?.visitNotes !== undefined) setVisitNotes(q.visitNotes ?? "");
  }, [q?.visitNotes]);

  const prepareDraft = useCallback(() => {
    if (!q) return;
    const d: Record<string, string | number | null> = {};
    for (const k of EDITABLE_FIELDS) d[k] = (q as Record<string, unknown>)[k] as string ?? "";
    for (const f of NUM_FIELDS) d[f.key] = (q as Record<string, unknown>)[f.key] as number ?? "";
    for (const f of FINANCE_FIELDS) d[f.key] = (q as Record<string, unknown>)[f.key] as number ?? "";
    d.latitude = q.latitude != null ? String(q.latitude) : "";
    d.longitude = q.longitude != null ? String(q.longitude) : "";
    d.notes = q.notes ?? "";
    setDraft(d);
  }, [q]);

  useEffect(() => {
    if (!q) return;
    if (initialEditing) {
      prepareDraft();
      setEditing(true);
      return;
    }
    setEditing(false);
    setDraft({});
  }, [initialEditing, prepareDraft, q]);

  if (loading || !q) return <p className="text-muted-foreground">Cargando…</p>;

  function startEditing() {
    router.push(`/dashboard/${id}/edit`, { scroll: false });
  }

  function cancelEditing() {
    router.replace(`/dashboard/${id}`, { scroll: false });
  }

  async function saveEdits() {
    if (!q) return;
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = {};
    for (const k of EDITABLE_FIELDS) {
      const v = (draft[k] as string)?.trim() || null;
      if (v !== ((q as Record<string, unknown>)[k] ?? null)) body[k] = v;
    }
    for (const f of NUM_FIELDS) {
      const raw = draft[f.key];
      const v = raw !== "" && raw != null ? parseFloat(String(raw)) : null;
      if (v !== ((q as Record<string, unknown>)[f.key] ?? null)) body[f.key] = v;
    }
    for (const f of FINANCE_FIELDS) {
      const raw = draft[f.key];
      const v = raw !== "" && raw != null ? parseFloat(String(raw)) : null;
      if (v == null || !Number.isFinite(v) || v <= 0) {
        setSaving(false);
        setError(`${f.label} es requerido`);
        return;
      }
      if (v !== ((q as Record<string, unknown>)[f.key] ?? null)) body[f.key] = v;
    }
    const draftLat = draft.latitude !== "" && draft.latitude != null ? parseFloat(String(draft.latitude)) : null;
    const draftLng = draft.longitude !== "" && draft.longitude != null ? parseFloat(String(draft.longitude)) : null;
    if (draftLat !== (q.latitude ?? null)) body.latitude = draftLat;
    if (draftLng !== (q.longitude ?? null)) body.longitude = draftLng;
    const nextNotes = (draft.notes as string)?.trim() || null;
    if (nextNotes !== (q.notes ?? null)) body.notes = nextNotes;
    const nextVisitNotes = visitNotes.trim() || null;
    if (nextVisitNotes !== (q.visitNotes ?? null)) body.visitNotes = nextVisitNotes;

    await editorRef.current?.save();
    if (Object.keys(body).length === 0) {
      setSaving(false);
      router.replace(`/dashboard/${id}`, { scroll: false });
      return;
    }
    const res = await fetch(`/api/quotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) { setError("Error al guardar"); return; }
    toast.success("Cambios guardados");
    router.replace(`/dashboard/${id}`, { scroll: false });
    load();
    onUpdated();
  }

  async function promote() {
    if (!q) return;
    if (!q.imagePath) {
      setError("Sube una imagen de la visita técnica para promover a cotización oficial.");
      return;
    }
    const costBreakdown = calculateSolarCost({
      generacion: q.generacion,
      hbs: q.hbs,
      adicionales: q.adicionales,
      descuento: q.descuento,
    });
    if (!costBreakdown?.finalCost || !q.ahorroMes) {
      setError("Completa generación y ahorro mensual estimado para promover a cotización oficial.");
      return;
    }
    setPromoting(true);
    setError("");
    const res = await fetch(`/api/quotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOfficial: true }),
    });
    setPromoting(false);
    if (!res.ok) { setError("Error al promover"); return; }
    toast.success("Cotización promovida a oficial");
    load();
    onUpdated();
  }

  async function handleDelete() {
    await fetch(`/api/quotations/${id}`, { method: "DELETE" });
    toast.success("Cotización eliminada");
    onUpdated();
    onBack();
  }

  function handleGeoClick() {
    if (q!.latitude != null && q!.longitude != null) {
      setGeoConfirmOpen(true);
    } else {
      doSaveLocation();
    }
  }

  async function doSaveLocation() {
    setSavingLocation(true);
    try {
      const pos = await requestCurrentPosition();
      const { latitude, longitude } = pos.coords;
      setDraft((d) => ({ ...d, latitude: String(latitude), longitude: String(longitude) }));
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
          { headers: { "Accept-Language": "es" } }
        ).then((r) => r.json());
        const updates = getAddressFieldsFromReverseGeocode(geo);
        setDraft((d) => ({
          ...d,
          latitude: String(latitude),
          longitude: String(longitude),
          country: updates.country || (d.country as string) || "",
          state: updates.state || (d.state as string) || "",
          city: updates.city || (d.city as string) || "",
          clientAddress: updates.clientAddress || (d.clientAddress as string) || "",
        }));
      } catch { /* just coords */ }
      toast.success("Ubicación obtenida — guarda para aplicar cambios");
    } catch (error) {
      toast.error(getGeolocationErrorMessage(error));
    } finally {
      setSavingLocation(false);
    }
  }

  function handleMapPin(lat: number, lng: number) {
    setDraft((d) => ({ ...d, latitude: String(lat), longitude: String(lng) }));
    // fire and forget reverse geocode to fill address fields
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "es" } }
    )
      .then((r) => r.json())
      .then((data) => {
        const updates = getAddressFieldsFromReverseGeocode(data);
        setDraft((d) => ({
          ...d,
          country: updates.country || (d.country as string) || "",
          state: updates.state || (d.state as string) || "",
          city: updates.city || (d.city as string) || "",
          clientAddress: updates.clientAddress || (d.clientAddress as string) || "",
        }));
      })
      .catch(() => {});
  }

  const hasCoords = q.latitude != null && q.longitude != null;
  const draftLat = editing && draft.latitude != null && draft.latitude !== "" ? Number(draft.latitude) : null;
  const draftLng = editing && draft.longitude != null && draft.longitude !== "" ? Number(draft.longitude) : null;
  const mapLat = editing ? (draftLat ?? q.latitude) : q.latitude;
  const mapLng = editing ? (draftLng ?? q.longitude) : q.longitude;
  const costBreakdown = calculateSolarCost({
    generacion: editing && draft.generacion !== "" && draft.generacion != null ? Number(draft.generacion) : q.generacion,
    hbs: editing && draft.hbs !== "" && draft.hbs != null ? Number(draft.hbs) : q.hbs,
    adicionales:
      editing && draft.adicionales !== "" && draft.adicionales != null ? Number(draft.adicionales) : q.adicionales,
    descuento:
      editing && draft.descuento !== "" && draft.descuento != null ? Number(draft.descuento) : q.descuento,
  });
  const projectionCostoTotal = costBreakdown?.finalCost ?? q.costoTotal ?? null;
  const projectionAhorroMes = editing
    ? draft.ahorroMes !== "" && draft.ahorroMes != null
      ? Number(draft.ahorroMes)
      : null
    : q.ahorroMes ?? null;
  return (
    <div className="mx-auto max-w-[1500px] space-y-6 px-3 pb-24 sm:px-4">
      <div className="sticky top-3 z-20 flex items-center justify-between gap-3 print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="shrink-0 rounded-full bg-background/95 shadow-sm backdrop-blur"
        >
          <ArrowLeft className="mr-1 size-4" /> Volver
        </Button>

        <div className="ml-auto flex items-center gap-1 rounded-full border bg-background/95 p-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
          {!editing && <QuotationActionsMenu shareableId={q.shareableId} compact />}

          {!editing && (
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.open(`/q/${q.shareableId}/export?print=1`, "_blank", "noopener,noreferrer")}>
              Imprimir / PDF
            </Button>
          )}

          {!editing ? (
            <Button variant="outline" size="sm" onClick={startEditing} className="rounded-full">
              <Pencil className="mr-1 size-3.5" /> Editar
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={cancelEditing} className="rounded-full">
                <X className="mr-1 size-3.5" /> Cancelar
              </Button>
              <Button
                size="sm"
                onClick={saveEdits}
                disabled={saving}
                className="rounded-full bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="mr-1 size-3.5" /> {saving ? "Guardando…" : "Guardar"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight">{q.clientName}</h2>
          <p className="text-sm text-muted-foreground">
            {q.user ? `Por ${[q.user.name, q.user.lastName].filter(Boolean).join(" ") || q.user.email || q.user.username} · ` : ""}
            Creada {new Date(q.createdAt).toLocaleDateString("es-CO")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={q.isOfficial ? "default" : "secondary"}>
            {q.isOfficial ? "Oficial" : "Pre-cotización"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Datos del cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {editing ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {CLIENT_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <Label htmlFor={`qd-${key}`} className="text-xs text-muted-foreground">{label}</Label>
                  <Input
                    id={`qd-${key}`}
                    name={key}
                    required={key === "clientName"}
                    value={String(draft[key] ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-2 md:grid-cols-2">
                <p><span className="text-muted-foreground">Email:</span> {q.clientEmail || "—"}</p>
                <p><span className="text-muted-foreground">Teléfono:</span> {q.clientPhone || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Ubicación:</span>
                <p className="mt-0.5">
                  {[q.country, q.state, q.city].filter(Boolean).join(", ") || "—"}
                  {q.clientAddress && ` · ${q.clientAddress}`}
                </p>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {hasCoords && (
              <>
                <a
                  href={`https://www.google.com/maps?q=${q.latitude},${q.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                >
                  <MapPin className="size-3.5" /> Maps
                </a>
                <a
                  href={`https://waze.com/ul?ll=${q.latitude},${q.longitude}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                >
                  <ExternalLink className="size-3.5" /> Waze
                </a>
              </>
            )}
            {editing && (
              <Button type="button" variant="outline" size="sm" onClick={handleGeoClick} disabled={savingLocation}>
                <MapPin className="mr-1 size-3.5" />
                {savingLocation ? "Obteniendo…" : "Usar mi ubicación"}
              </Button>
            )}
          </div>

          {(hasCoords || editing) && (
            <div className="space-y-1">
              {editing && (
                <p className="text-xs text-muted-foreground">
                  Clic en el mapa o arrastra el pin para ajustar. Guarda para aplicar cambios.
                </p>
              )}
              <LocationMapPicker
                lat={mapLat}
                lng={mapLng}
                height={240}
                readOnly={!editing}
                onLocationChange={handleMapPin}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Parámetros del sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {NUM_FIELDS.map((p) => (
                <div key={p.key}>
                  <Label htmlFor={`qd-${p.key}`} className="text-xs text-muted-foreground">{p.label} ({p.unit})</Label>
                  <Input
                    id={`qd-${p.key}`}
                    name={p.key}
                    type="number"
                    step="any"
                    value={String(draft[p.key] ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, [p.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-3">
              {NUM_FIELDS.map((p) => {
                const v = (q as Record<string, unknown>)[p.key];
                return (
                  <div key={p.key} className="flex items-baseline justify-between rounded-lg bg-muted px-3 py-2">
                    <span className="text-muted-foreground">{p.label}</span>
                    <span className="font-medium">
                      {v != null ? `${v} ${p.unit}` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Proyección financiera</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {editing && (
            <div className="grid gap-3 md:grid-cols-2">
              {FINANCE_FIELDS.map((field) => (
                <div key={field.key}>
                  <Label htmlFor={`qd-${field.key}`} className="text-xs text-muted-foreground">
                    {field.label} * ({field.unit})
                  </Label>
                  <Input
                    id={`qd-${field.key}`}
                    name={field.key}
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={String(draft[field.key] ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}
          <QuotationFinancialProjection
            costoTotal={projectionCostoTotal}
            ahorroMes={projectionAhorroMes}
            costBreakdown={costBreakdown}
          />
        </CardContent>
      </Card>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="qd-notes"
              name="notes"
              value={String(draft.notes ?? "")}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={4}
            />
          </CardContent>
        </Card>
      ) : q.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{q.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Visita Técnica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {q.imagePath ? (
            <>
              {editing ? (
                <ImageEditor
                  key={`${q.id}:${q.annotationData ?? ""}`}
                  ref={editorRef}
                  imageUrl={q.imagePath}
                  initialAnnotationData={q.annotationData}
                  quotationId={q.id}
                  onSaved={load}
                />
              ) : (
                <ImageAnnotationViewer imageUrl={q.imagePath} annotationData={q.annotationData} />
              )}
              {editing ? (
                <Textarea
                  id="qd-visitNotes"
                  name="visitNotes"
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  onBlur={async () => {
                    await fetch(`/api/quotations/${q.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ visitNotes: visitNotes.trim() || null }),
                    });
                  }}
                  placeholder="Anotaciones de la visita…"
                  rows={3}
                />
              ) : (
                q.visitNotes && <p className="text-sm whitespace-pre-wrap">{q.visitNotes}</p>
              )}
            </>
          ) : editing ? (
            <ImageUploader quotationId={q.id} onUploaded={load} />
          ) : (
            <p className="text-sm text-muted-foreground">Sin imagen. Activa el modo edición para subir una.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {!q.isOfficial && (
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={promote} disabled={promoting}>
            {promoting ? "Promoviendo…" : "Promover a oficial"}
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" />}>
            <Trash2 className="mr-1 size-4" /> Eliminar
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar cotización</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Geolocation confirmation dialog */}
      <AlertDialog open={geoConfirmOpen} onOpenChange={setGeoConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Actualizar ubicación</AlertDialogTitle>
            <AlertDialogDescription>
              Esta cotización ya tiene coordenadas guardadas ({q.latitude?.toFixed(4)}, {q.longitude?.toFixed(4)}).
              ¿Deseas sobrescribir con tu ubicación actual?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setGeoConfirmOpen(false); doSaveLocation(); }}>
              Sí, actualizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
