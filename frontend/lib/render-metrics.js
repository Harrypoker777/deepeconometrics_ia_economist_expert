function getMetricStore() {
  if (typeof window === 'undefined') return null;

  if (!window.__deepeconometricsPerf) {
    window.__deepeconometricsPerf = {};
  }

  return window.__deepeconometricsPerf;
}

export function recordRenderMetric(id, phase, actualDuration, baseDuration) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const store = getMetricStore();
  if (!store) return;

  const current = store[id] || {
    avgActualMs: 0,
    lastActualMs: 0,
    lastBaseMs: 0,
    lastPhase: '',
    maxActualMs: 0,
    renders: 0,
    totalActualMs: 0,
    updatedAt: '',
  };

  current.renders += 1;
  current.totalActualMs += actualDuration;
  current.avgActualMs = Number((current.totalActualMs / current.renders).toFixed(2));
  current.lastActualMs = Number(actualDuration.toFixed(2));
  current.lastBaseMs = Number(baseDuration.toFixed(2));
  current.lastPhase = phase;
  current.maxActualMs = Number(Math.max(current.maxActualMs, actualDuration).toFixed(2));
  current.updatedAt = new Date().toISOString();

  store[id] = current;
}
