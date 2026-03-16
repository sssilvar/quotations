import { SOLAR_COST_PRICE_TABLE } from "@/lib/solar-price-table";

const DEFAULT_HBS = 3.8;
const PANEL_FACTOR = 0.62;
const DAYS_PER_MONTH = 30;

export type SolarCostBreakdown = {
  panelCount: number;
  estimatedGeneration: number;
  baseCost: number;
  totalWithAdditions: number;
  finalCost: number;
};

export function calculateSolarCost(input: {
  generacion?: number | null;
  hbs?: number | null;
  adicionales?: number | null;
  descuento?: number | null;
}): SolarCostBreakdown | null {
  const generation = input.generacion ?? null;
  if (generation == null || !Number.isFinite(generation) || generation <= 0) {
    return null;
  }

  const hbs = input.hbs && input.hbs > 0 ? input.hbs : DEFAULT_HBS;
  const additions = input.adicionales && Number.isFinite(input.adicionales) ? input.adicionales : 0;
  const discount = input.descuento && Number.isFinite(input.descuento) ? input.descuento : 0;

  let bestPanelCount = 1;
  let bestEstimatedGeneration = roundToTwoDecimals(PANEL_FACTOR * DAYS_PER_MONTH * hbs);
  let bestError = Math.abs(bestEstimatedGeneration - generation);

  for (let panelCount = 2; panelCount <= SOLAR_COST_PRICE_TABLE.length; panelCount += 1) {
    const estimatedGeneration = roundToTwoDecimals(PANEL_FACTOR * panelCount * DAYS_PER_MONTH * hbs);
    const error = Math.abs(estimatedGeneration - generation);
    if (error < bestError) {
      bestError = error;
      bestPanelCount = panelCount;
      bestEstimatedGeneration = estimatedGeneration;
    }
  }

  const baseCost = SOLAR_COST_PRICE_TABLE[bestPanelCount - 1];
  const totalWithAdditions = baseCost + additions;
  const finalCost = Math.round(totalWithAdditions * (1 - discount / 100));

  return {
    panelCount: bestPanelCount,
    estimatedGeneration: bestEstimatedGeneration,
    baseCost,
    totalWithAdditions,
    finalCost,
  };
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}
