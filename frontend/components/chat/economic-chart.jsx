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

  if (chartData.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-sm font-medium text-foreground">{chart.title || 'Proyección económica'}</p>
      {chart.summary && <p className="mt-1 text-xs text-muted-foreground">{chart.summary}</p>}

      <div className="mt-3 h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(0 0% 45%)', fontSize: 11 }} stroke="hsl(0 0% 90%)" />
            <YAxis tick={{ fill: 'hsl(0 0% 45%)', fontSize: 11 }} stroke="hsl(0 0% 90%)" width={60} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid hsl(0 0% 90%)',
                background: '#fff',
                color: '#212121',
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area dataKey="lowerBase" fill="transparent" stackId="confidence" stroke="transparent" />
            <Area
              dataKey="confidenceBand"
              fill="rgba(99,102,241,0.12)"
              name="Banda de confianza"
              stackId="confidence"
              stroke="transparent"
            />
            <Line dataKey="value" dot={false} name="Serie principal" stroke="#212121" strokeWidth={2} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}