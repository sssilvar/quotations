import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageAnnotationViewer } from "@/app/dashboard/ImageAnnotationViewer";
import { QuotationFinancialProjection } from "@/components/QuotationFinancialProjection";
import { calculateSolarCost } from "@/lib/solar-cost";

export type QuotationDocumentData = {
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientAddress?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  consumoKwh?: number | null;
  tarifaKwh?: number | null;
  contribucion?: number | null;
  alumbrado?: number | null;
  autoconsumo?: number | null;
  hbs?: number | null;
  generacion?: number | null;
  adicionales?: number | null;
  descuento?: number | null;
  costoTotal?: number | null;
  ahorroMes?: number | null;
  isOfficial: boolean;
  imagePath?: string | null;
  annotationData?: string | null;
  visitNotes?: string | null;
  notes?: string | null;
  createdAt: string | Date;
  user: { username: string; name?: string | null; lastName?: string | null; email?: string | null };
};

export function QuotationDocument({ q }: { q: QuotationDocumentData }) {
  const locationLine = [q.country, q.state, q.city].filter(Boolean).join(", ");
  const paramsList = [
    { label: "Consumo", value: q.consumoKwh, unit: "kWh/mes" },
    { label: "Tarifa", value: q.tarifaKwh, unit: "$" },
    { label: "Contribución", value: q.contribucion, unit: "%" },
    { label: "Alu. Público", value: q.alumbrado, unit: "%" },
    { label: "Autoconsumo", value: q.autoconsumo, unit: "%" },
    { label: "HBS", value: q.hbs, unit: "h/día" },
    { label: "Generación", value: q.generacion, unit: "kWh/mes" },
    { label: "Adicionales", value: q.adicionales, unit: "$" },
    { label: "Descuento", value: q.descuento, unit: "%" },
  ];
  const costBreakdown = calculateSolarCost({
    generacion: q.generacion,
    hbs: q.hbs,
    adicionales: q.adicionales,
    descuento: q.descuento,
  });
  const projectionCost = costBreakdown?.finalCost ?? q.costoTotal ?? null;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{q.clientName}</CardTitle>
          <Badge variant={q.isOfficial ? "default" : "secondary"}>
            {q.isOfficial ? "Cotización oficial" : "Pre-cotización"}
          </Badge>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            Por {[q.user.name, q.user.lastName].filter(Boolean).join(" ") || q.user.email || q.user.username}
            {" · "}
            {new Date(q.createdAt).toLocaleDateString("es-CO")}
          </span>
        </p>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        <section>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Cliente
          </h3>
          <div className="space-y-0.5 text-sm">
            {q.clientEmail && <p>Email: {q.clientEmail}</p>}
            {q.clientPhone && <p>Teléfono: {q.clientPhone}</p>}
            {(locationLine || q.clientAddress) && (
              <p>
                {locationLine}
                {q.clientAddress && (locationLine ? ` · ${q.clientAddress}` : q.clientAddress)}
              </p>
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Parámetros
          </h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {paramsList
              .filter((p) => p.value != null)
              .map((p) => (
                <div key={p.label} className="rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{p.label}</span>
                  <p className="font-medium">
                    {p.value} {p.unit}
                  </p>
                </div>
              ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Proyección financiera
          </h3>
          <QuotationFinancialProjection
            costoTotal={projectionCost}
            ahorroMes={q.ahorroMes}
            costBreakdown={costBreakdown}
          />
        </section>

        {q.notes && (
          <section>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Notas
            </h3>
            <p className="text-sm whitespace-pre-wrap">{q.notes}</p>
          </section>
        )}

        {(q.imagePath || q.visitNotes) && (
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Visita técnica
            </h3>
            {q.imagePath && (
              <div className="mb-2">
                <ImageAnnotationViewer imageUrl={q.imagePath} annotationData={q.annotationData} />
              </div>
            )}
            {q.visitNotes && (
              <p className="text-sm whitespace-pre-wrap">{q.visitNotes}</p>
            )}
          </section>
        )}

        <section className="space-y-4 border-t pt-5">
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Información para el cliente
            </h3>
            <p className="text-sm text-muted-foreground">
              Esta propuesta corresponde a un sistema solar fotovoltaico conectado a la red (On-Grid).
              Durante el día la generación solar alimenta los consumos del inmueble y, si hay excedentes,
              estos pueden inyectarse a la red según la configuración y condiciones del operador.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted px-3 py-3 text-sm">
              <p className="font-medium">¿Qué incluye?</p>
              <p className="mt-1 text-muted-foreground">
                Diseño, suministro, instalación, puesta en marcha y acompañamiento técnico del sistema.
              </p>
            </div>
            <div className="rounded-lg bg-muted px-3 py-3 text-sm">
              <p className="font-medium">Beneficio esperado</p>
              <p className="mt-1 text-muted-foreground">
                Reducción del costo energético, monitoreo del desempeño y aprovechamiento de energía limpia.
              </p>
            </div>
            <div className="rounded-lg bg-muted px-3 py-3 text-sm">
              <p className="font-medium">Marco de referencia</p>
              <p className="mt-1 text-muted-foreground">
                Proyecto alineado con beneficios aplicables a FNCER en Colombia, sujeto a validación del caso.
              </p>
            </div>
          </div>

          <div className="rounded-lg border px-4 py-3 text-sm">
            <p className="font-medium">Soinsolar S.A.S.</p>
            <p className="mt-1 text-muted-foreground">
              Empresa especializada en sistemas solares fotovoltaicos conectados a la red, enfocada en
              estructurar propuestas claras para ahorro, operación y acompañamiento comercial al cliente final.
            </p>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
