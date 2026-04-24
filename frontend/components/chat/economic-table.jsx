function formatSeriesValue(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/D';
  }

  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function EconomicTable({ chart }) {
  if (!chart?.series?.length) return null;

  const rowCount = chart.series.length;
  const historicalCount = chart.series.filter((item) => item.type !== 'forecast').length;
  const forecastCount = chart.series.filter((item) => item.type === 'forecast').length;
  const hasConfidenceBand = chart.series.some(
    (item) => typeof item.lower === 'number' || typeof item.upper === 'number'
  );

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-background/84">
      <header className="flex items-center justify-between gap-3 border-b border-border/75 bg-secondary/38 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Tabla de resultados
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {rowCount} puntos | {historicalCount} historicos | {forecastCount} forecast
          </p>
        </div>
      </header>

      <div className="max-h-[320px] overflow-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="bg-secondary/34">
            <tr>
              <th className="border-b border-border/70 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Periodo
              </th>
              <th className="border-b border-border/70 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Valor
              </th>
              <th className="border-b border-border/70 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Tipo
              </th>
              {hasConfidenceBand && (
                <>
                  <th className="border-b border-border/70 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Inferior
                  </th>
                  <th className="border-b border-border/70 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Superior
                  </th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {chart.series.map((item) => (
              <tr key={`${item.label}-${item.type}`} className="odd:bg-background/60 even:bg-secondary/18">
                <td className="border-b border-border/60 px-3 py-2.5 text-foreground">
                  {item.label}
                </td>
                <td className="border-b border-border/60 px-3 py-2.5 text-foreground">
                  {formatSeriesValue(item.value)}
                </td>
                <td className="border-b border-border/60 px-3 py-2.5 text-muted-foreground">
                  {item.type === 'forecast' ? 'Forecast' : 'Historico'}
                </td>
                {hasConfidenceBand && (
                  <>
                    <td className="border-b border-border/60 px-3 py-2.5 text-muted-foreground">
                      {formatSeriesValue(item.lower)}
                    </td>
                    <td className="border-b border-border/60 px-3 py-2.5 text-muted-foreground">
                      {formatSeriesValue(item.upper)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
