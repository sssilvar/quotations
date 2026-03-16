export const PROJECTION_YEARS = 10;

export type CashflowProjectionRow = {
  year: number;
  label: string;
  accumulatedSavings: number;
  netCashFlow: number;
};

export type CashflowProjection = {
  annualSavings: number;
  paybackYears: number | null;
  roiPercent: number | null;
  rows: CashflowProjectionRow[];
};

export type ProjectionInputs = {
  costoTotal?: number | null;
  ahorroMes?: number | null;
};

export function buildCashflowProjection(
  costoTotal?: number | null,
  ahorroMes?: number | null,
  years = PROJECTION_YEARS
): CashflowProjection | null {
  if (
    costoTotal == null ||
    ahorroMes == null ||
    !Number.isFinite(costoTotal) ||
    !Number.isFinite(ahorroMes) ||
    costoTotal <= 0 ||
    ahorroMes <= 0
  ) {
    return null;
  }

  const annualSavings = ahorroMes * 12;
  const rows: CashflowProjectionRow[] = [
    {
      year: 0,
      label: "Año 0",
      accumulatedSavings: 0,
      netCashFlow: -costoTotal,
    },
  ];

  for (let year = 1; year <= years; year += 1) {
    const accumulatedSavings = year * annualSavings;
    rows.push({
      year,
      label: `Año ${year}`,
      accumulatedSavings,
      netCashFlow: accumulatedSavings - costoTotal,
    });
  }

  return {
    annualSavings,
    paybackYears: annualSavings > 0 ? costoTotal / annualSavings : null,
    roiPercent: costoTotal > 0 ? (annualSavings / costoTotal) * 100 : null,
    rows,
  };
}

export function formatCurrency(value: number) {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);
  return `${sign}$ ${formatPlainNumber(Math.round(absoluteValue))}`;
}

export function formatCompactCurrency(value: number) {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000_000) {
    return `${sign}$ ${formatPlainNumber(absoluteValue / 1_000_000_000)} B`;
  }
  if (absoluteValue >= 1_000_000) {
    return `${sign}$ ${formatPlainNumber(absoluteValue / 1_000_000)} M`;
  }
  if (absoluteValue >= 1_000) {
    return `${sign}$ ${formatPlainNumber(absoluteValue / 1_000)} mil`;
  }

  return `${sign}$ ${formatPlainNumber(absoluteValue)}`;
}

export function formatPlainNumber(value: number) {
  const [wholePart, decimalPart] = value.toFixed(value % 1 === 0 ? 0 : 2).split(".");
  const groupedWholePart = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimalPart ? `${groupedWholePart},${decimalPart}` : groupedWholePart;
}
