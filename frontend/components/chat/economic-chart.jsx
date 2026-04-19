'use client';

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
  return series.map((item) => ({
    ...item,
    lowerBase: item.lower ?? null,
    confidenceBand:
      typeof item.upper === 'number' && typeof item.lower === 'number'
        ? Number((item.upper - item.lower).toFixed(2))
        : null,
  }));
}

export function EconomicChart({ chart }) {
  const chartData = chart?.series ? enrichData(chart.series) : [];
  const borderColor = 'hsl(var(--border))';
  const tickColor = 'hsl(var(--muted-foreground))';
  const cardColor = 'hsl(var(--card))';
  const foregroundColor = 'hsl(var(--foreground))';
  const bandColor = 'hsl(var(--secondary))';

  if (chartData.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">
        {chart.title || 'Proyeccion economica'}
      </p>
      {chart.summary && (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {chart.summary}
        </p>
      )}

      <div className="mt-3 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="2 4" stroke={borderColor} />
            <XAxis
              dataKey="label"
              tick={{ fill: tickColor, fontSize: 11 }}
              stroke={borderColor}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 11 }}
              stroke={borderColor}
              width={60}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: `1px solid ${borderColor}`,
                background: cardColor,
                color: foregroundColor,
                fontSize: 12,
                boxShadow: 'none',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              dataKey="lowerBase"
              fill="transparent"
              stackId="confidence"
              stroke="transparent"
            />
            <Area
              dataKey="confidenceBand"
              fill={bandColor}
              fillOpacity={0.8}
              name="Banda de confianza"
              stackId="confidence"
              stroke="transparent"
            />
            <Line
              dataKey="value"
              dot={false}
              name="Serie principal"
              stroke={foregroundColor}
              strokeWidth={1.75}
              type="monotone"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
