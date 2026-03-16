"use client";

import { useState } from "react";
import {
  formatCompactCurrency,
  formatCurrency,
  type CashflowProjectionRow,
} from "@/lib/quotation-finance";

type Props = {
  rows: CashflowProjectionRow[];
};

const CHART_WIDTH = 820;
const CHART_HEIGHT = 320;
const PADDING = { top: 16, right: 20, bottom: 44, left: 84 };
const POSITIVE_BAR_COLOR = "#0369a1";
const NEGATIVE_BAR_COLOR = "#dc2626";
const GRID_COLOR = "#e4e4e7";
const LABEL_COLOR = "#71717a";

export function QuotationFinancialProjectionSvg({ rows }: Props) {
  const [activePoint, setActivePoint] = useState<{
    row: CashflowProjectionRow;
    x: number;
    y: number;
  } | null>(null);

  if (!rows.length) return null;

  const values = rows.map((row) => row.netCashFlow);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const domainPadding = Math.max((maxValue - minValue) * 0.08, 1);
  const chartMin = minValue - domainPadding;
  const chartMax = maxValue + domainPadding;
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const barSlot = plotWidth / rows.length;
  const barWidth = Math.min(34, barSlot * 0.58);
  const tickValues = buildTickValues(chartMin, chartMax);
  const zeroY = getY(0, chartMin, chartMax, plotHeight);

  return (
    <div className="w-full overflow-x-auto">
      <div className="relative mx-auto w-[820px] min-w-[820px] print:w-full print:min-w-0">
        {activePoint && (
          <div
            className="pointer-events-none absolute z-10 min-w-40 rounded-lg border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-xl"
            style={{
              left: Math.min(Math.max(activePoint.x - 72, 8), CHART_WIDTH - 168),
              top: Math.max(activePoint.y - 64, 8),
            }}
          >
            <p className="font-medium">{activePoint.row.label}</p>
            <p className="mt-1 text-muted-foreground">
              Flujo neto: <span className="font-mono text-foreground">{formatCurrency(activePoint.row.netCashFlow)}</span>
            </p>
            <p className="text-muted-foreground">
              Ahorro acumulado:{" "}
              <span className="font-mono text-foreground">{formatCurrency(activePoint.row.accumulatedSavings)}</span>
            </p>
          </div>
        )}
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="block h-auto w-[820px] max-w-none print:w-full"
          role="img"
          aria-label="Grafica de proyeccion de flujo de caja"
        >
          {tickValues.map((tick) => {
            const y = getY(tick, chartMin, chartMax, plotHeight);
            return (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  y1={y}
                  x2={CHART_WIDTH - PADDING.right}
                  y2={y}
                  stroke={GRID_COLOR}
                  strokeWidth="1"
                />
                <text
                  x={PADDING.left - 10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize="11"
                  fill={LABEL_COLOR}
                >
                  {formatCompactCurrency(tick)}
                </text>
              </g>
            );
          })}

          <line
            x1={PADDING.left}
            y1={zeroY}
            x2={CHART_WIDTH - PADDING.right}
            y2={zeroY}
            stroke="#a1a1aa"
            strokeWidth="1.5"
          />

          {rows.map((row, index) => {
            const centerX = PADDING.left + barSlot * index + barSlot / 2;
            const y = getY(row.netCashFlow, chartMin, chartMax, plotHeight);
            const barHeight = Math.abs(zeroY - y);
            const rectY = row.netCashFlow >= 0 ? y : zeroY;
            const showLabel =
              row.year === 0 || row.year === 5 || row.year === rows[rows.length - 1]?.year;

            return (
              <g key={row.label}>
                <rect
                  x={centerX - barWidth / 2}
                  y={Math.min(rectY, CHART_HEIGHT - PADDING.bottom - 2)}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  rx="6"
                  fill={row.netCashFlow >= 0 ? POSITIVE_BAR_COLOR : NEGATIVE_BAR_COLOR}
                  className="cursor-pointer"
                  onMouseEnter={() => setActivePoint({ row, x: centerX, y: Math.min(y, zeroY) })}
                  onMouseMove={() => setActivePoint({ row, x: centerX, y: Math.min(y, zeroY) })}
                  onMouseLeave={() => setActivePoint(null)}
                  onTouchStart={() => setActivePoint({ row, x: centerX, y: Math.min(y, zeroY) })}
                />
                <title>
                  {`${row.label} · Flujo neto ${formatCurrency(row.netCashFlow)} · Ahorro acumulado ${formatCurrency(row.accumulatedSavings)}`}
                </title>
                {showLabel && (
                  <text
                    x={centerX}
                    y={CHART_HEIGHT - PADDING.bottom + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fill={LABEL_COLOR}
                  >
                    {row.year}
                  </text>
                )}
              </g>
            );
          })}

          <text
            x={CHART_WIDTH / 2}
            y={CHART_HEIGHT - 8}
            textAnchor="middle"
            fontSize="11"
            fill={LABEL_COLOR}
          >
            Anos proyectados
          </text>
        </svg>
      </div>
    </div>
  );
}

function getY(value: number, min: number, max: number, plotHeight: number) {
  return PADDING.top + ((max - value) / (max - min || 1)) * plotHeight;
}

function buildTickValues(min: number, max: number) {
  const ticks = Array.from({ length: 5 }, (_, index) => max - ((max - min) * index) / 4);
  return Array.from(new Set(ticks.map((tick) => Math.round(tick))));
}
