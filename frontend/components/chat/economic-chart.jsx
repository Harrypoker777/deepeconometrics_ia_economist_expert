'use client';

import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function enrichData(series) {
  return series.map((item) => {
    const lower = typeof item.lower === 'number' ? item.lower : null;
    const upper = typeof item.upper === 'number' ? item.upper : null;
    const isForecast = item.type === 'forecast';

    return {
      ...item,
      historical: isForecast ? null : item.value,
      forecast: isForecast ? item.value : null,
      lowerBase: lower,
      confidenceBand:
        typeof upper === 'number' && typeof lower === 'number'
          ? Number((upper - lower).toFixed(2))
          : null,
    };
  });
}

export function EconomicChart({ chart }) {
  const chartData = useMemo(
    () => (chart?.series ? enrichData(chart.series) : []),
    [chart]
  );

  if (chartData.length === 0) return null;

  const borderColor = 'hsl(var(--border))';
  const tickColor = 'hsl(var(--muted-foreground))';
  const cardColor = 'hsl(var(--card))';
  const foregroundColor = 'hsl(var(--foreground))';
  const accentColor = 'hsl(var(--accent))';
  const accentStrong = 'hsl(var(--accent-strong))';

  const hasForecast = chartData.some((row) => row.forecast != null);

  return (
    <figure className="overflow-hidden rounded-[1.5rem] border border-border/85 bg-card/90">
      <header className="flex items-start justify-between gap-3 border-b border-border/75 bg-secondary/45 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {chart.title || 'Proyeccion economica'}
          </p>

          {chart.summary && (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {chart.summary}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full" style={{ background: foregroundColor }} />
            Observado
          </span>

          {hasForecast && (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: accentStrong }} />
              Forecast
            </span>
          )}
        </div>
      </header>

      <div className="h-[296px] w-full p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 2 }}>
            <defs>
              <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.22} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="2 4" stroke={borderColor} vertical={false} />

            <XAxis
              dataKey="label"
              tick={{ fill: tickColor, fontSize: 11 }}
              stroke={borderColor}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              tick={{ fill: tickColor, fontSize: 11 }}
              stroke={borderColor}
              tickLine={false}
              axisLine={false}
              width={58}
            />

            <Tooltip
              contentStyle={{
                borderRadius: 14,
                border: `1px solid ${borderColor}`,
                background: cardColor,
                color: foregroundColor,
                fontSize: 12,
                boxShadow: '0 14px 32px rgb(0 0 0 / 0.12)',
              }}
              cursor={{ stroke: accentStrong, strokeOpacity: 0.4, strokeDasharray: '3 4' }}
            />

            <Legend
              verticalAlign="bottom"
              iconType="plainline"
              wrapperStyle={{ fontSize: 11, color: tickColor, paddingTop: 6 }}
            />

            <Area
              dataKey="lowerBase"
              fill="transparent"
              stackId="confidence"
              stroke="transparent"
              isAnimationActive={false}
              legendType="none"
            />

            <Area
              dataKey="confidenceBand"
              fill="url(#forecastBand)"
              name="Banda de confianza"
              stackId="confidence"
              stroke="transparent"
              isAnimationActive
            />

            <Line
              dataKey="historical"
              name="Observado"
              stroke={foregroundColor}
              strokeWidth={1.9}
              dot={false}
              type="monotone"
              connectNulls
              isAnimationActive
            />

            <Line
              dataKey="forecast"
              name="Forecast"
              stroke={accentStrong}
              strokeDasharray="5 4"
              strokeWidth={2}
              dot={{ fill: accentStrong, r: 2.4 }}
              type="monotone"
              connectNulls
              isAnimationActive
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
