function getZScore(confidenceLevel) {
  if (confidenceLevel >= 0.99) {
    return 2.576;
  }

  if (confidenceLevel >= 0.95) {
    return 1.96;
  }

  if (confidenceLevel >= 0.9) {
    return 1.645;
  }

  return 1.282;
}

function formatPeriodLabel(rawDate) {
  const year = rawDate.getUTCFullYear();
  const month = String(rawDate.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function nextLabels(existingLabels, horizon) {
  const lastLabel = existingLabels.at(-1);
  const monthlyMatch = typeof lastLabel === 'string' ? lastLabel.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/) : null;

  if (!monthlyMatch) {
    return Array.from({ length: horizon }, (_, index) => `T+${index + 1}`);
  }

  const year = Number(monthlyMatch[1]);
  const month = Number(monthlyMatch[2]) - 1;
  const start = new Date(Date.UTC(year, month, 1));

  return Array.from({ length: horizon }, (_, index) => {
    const date = new Date(start);
    date.setUTCMonth(date.getUTCMonth() + index + 1);
    return formatPeriodLabel(date);
  });
}

export function buildForecast(observations, { horizon = 6, confidenceLevel = 0.95 } = {}) {
  if (!Array.isArray(observations) || observations.length < 3) {
    throw new Error('Se necesitan al menos tres observaciones para generar un forecast OLS.');
  }

  const cleanSeries = observations.map((item, index) => ({
    label: item.label || `P${index + 1}`,
    value: Number(item.value),
  }));

  if (cleanSeries.some((item) => !Number.isFinite(item.value))) {
    throw new Error('La serie contiene valores no numericos.');
  }

  const n = cleanSeries.length;
  const xs = cleanSeries.map((_, index) => index + 1);
  const ys = cleanSeries.map((item) => item.value);
  const meanX = xs.reduce((sum, value) => sum + value, 0) / n;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / n;

  let sxx = 0;
  let sxy = 0;

  for (let index = 0; index < n; index += 1) {
    const dx = xs[index] - meanX;
    sxx += dx * dx;
    sxy += dx * (ys[index] - meanY);
  }

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const fitted = xs.map((value) => intercept + slope * value);
  const rss = ys.reduce((sum, value, index) => sum + (value - fitted[index]) ** 2, 0);
  const variance = rss / Math.max(n - 2, 1);
  const zScore = getZScore(confidenceLevel);
  const futureLabels = nextLabels(cleanSeries.map((item) => item.label), horizon);

  const historicalSeries = cleanSeries.map((item) => ({
    label: item.label,
    value: Number(item.value.toFixed(2)),
    lower: null,
    upper: null,
    type: 'historical',
  }));

  const forecastSeries = futureLabels.map((label, index) => {
    const xValue = n + index + 1;
    const prediction = intercept + slope * xValue;
    const standardError = Math.sqrt(variance * (1 + 1 / n + ((xValue - meanX) ** 2) / sxx));
    const lower = prediction - zScore * standardError;
    const upper = prediction + zScore * standardError;

    return {
      label,
      value: Number(prediction.toFixed(2)),
      lower: Number(lower.toFixed(2)),
      upper: Number(upper.toFixed(2)),
      type: 'forecast',
    };
  });

  const totalVariance = ys.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  const rSquared = totalVariance === 0 ? 1 : 1 - rss / totalVariance;
  const allSeries = [...historicalSeries, ...forecastSeries];
  const rows = allSeries.map((item) => ({
    period: item.label,
    value: item.type === 'historical' ? item.value : null,
    forecast: item.type === 'forecast' ? item.value : null,
    lower: item.lower,
    upper: item.upper,
    pointType: item.type,
  }));

  return {
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(4)),
    rSquared: Number(rSquared.toFixed(4)),
    method: 'Regresion lineal OLS sobre indice temporal',
    confidenceLevel,
    series: allSeries,
    rows,
  };
}