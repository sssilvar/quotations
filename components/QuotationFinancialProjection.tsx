import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildCashflowProjection,
  formatCurrency,
  formatPlainNumber,
} from "@/lib/quotation-finance";
import type { SolarCostBreakdown } from "@/lib/solar-cost";
import { QuotationFinancialProjectionSvg } from "@/components/QuotationFinancialProjectionSvg";

type Props = {
  costoTotal?: number | null;
  ahorroMes?: number | null;
  costBreakdown?: SolarCostBreakdown | null;
};

export function QuotationFinancialProjection({ costoTotal, ahorroMes, costBreakdown }: Props) {
  const projection = buildCashflowProjection(costoTotal, ahorroMes);

  if (!projection) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
        Completa <span className="font-medium text-foreground">Costo total</span> y{" "}
        <span className="font-medium text-foreground">Ahorro mensual estimado</span> para ver la
        proyección de flujo de caja a 10 años.
      </div>
    );
  }

  const paybackLabel =
    projection.paybackYears == null
      ? "N/D"
      : projection.paybackYears > 10
        ? ">10 años"
        : `${projection.paybackYears.toFixed(1)} años`;

  const breakEvenRow = projection.rows.find((row) => row.year > 0 && row.netCashFlow >= 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={costBreakdown ? `Costo total · ${costBreakdown.panelCount} paneles` : "Costo total"}
          value={formatCurrency(costoTotal!)}
        />
        <MetricCard label="Ahorro mensual" value={formatCurrency(ahorroMes!)} />
        <MetricCard label="Ahorro anual" value={formatCurrency(projection.annualSavings)} />
        <MetricCard
          label="Payback / ROI"
          value={`${paybackLabel} · ${projection.roiPercent?.toFixed(1) ?? "0.0"}%`}
        />
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div>
          <h3 className="text-sm font-medium">Proyección flujo de caja</h3>
          <p className="text-xs text-muted-foreground">
            Modelo lineal con ahorro anual constante. Año 0 representa la inversión inicial.
          </p>
          {costBreakdown && (
            <p className="mt-1 text-xs text-muted-foreground">
              Base {formatCurrency(costBreakdown.baseCost)}
              {" · "}
              generación estimada {formatPlainNumber(costBreakdown.estimatedGeneration)} kWh/mes
            </p>
          )}
        </div>

        <QuotationFinancialProjectionSvg rows={projection.rows} />
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-medium">Tabla de proyección</h3>
          <p className="text-xs text-muted-foreground">
            {breakEvenRow
              ? `La inversión se vuelve positiva en ${breakEvenRow.label.toLowerCase()}.`
              : "La inversión no alcanza flujo positivo dentro del horizonte de 10 años."}
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Año</TableHead>
              <TableHead className="text-right">Ahorro acumulado</TableHead>
              <TableHead className="text-right">Flujo de caja neto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projection.rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.accumulatedSavings)}</TableCell>
                <TableCell
                  className={row.netCashFlow >= 0 ? "text-right text-sky-700" : "text-right text-red-600"}
                >
                  {formatCurrency(row.netCashFlow)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Esta proyección no incluye escalamiento tarifario, degradación de paneles, inflación, tasa
        de descuento ni financiación.
      </p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}
