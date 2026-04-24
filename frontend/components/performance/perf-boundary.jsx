'use client';

import { Profiler } from 'react';
import { recordRenderMetric } from '@/lib/render-metrics';

function handleRender(id, phase, actualDuration, baseDuration) {
  recordRenderMetric(id, phase, actualDuration, baseDuration);
}

export function PerfBoundary({ id, children }) {
  if (process.env.NODE_ENV === 'production') {
    return children;
  }

  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  );
}
