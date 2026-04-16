const chartBlockPattern = /```json\s*([\s\S]*?)```/gi;
const urlPattern = /https?:\/\/[^\s)]+/gi;

export const INDICATOR_PROMPTS = [
  {
    label: 'Inflacion (IPC)',
    description: 'Tendencia reciente y forecast a 12 meses.',
    prompt: 'Consulta el indicador IPC, explica la tendencia reciente y genera un forecast OLS a 12 meses. Incluye un bloque JSON para el grafico.',
  },
  {
    label: 'PIB y crecimiento',
    description: 'Actividad economica con proyeccion a 6 periodos.',
    prompt: 'Consulta el PIB, resume los drivers recientes y proyecta 6 periodos con una explicacion ejecutiva y bloque JSON de grafico.',
  },
  {
    label: 'Reporte descargable',
    description: 'Forecast con archivos Excel y PDF.',
    prompt: 'Consulta el IPC, genera un forecast a 6 periodos y despues crea un Excel y un PDF descargables con el resultado.',
  },
];

function tryParseChartObject(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const source = Array.isArray(candidate.series)
    ? candidate
    : candidate.chart && Array.isArray(candidate.chart.series)
      ? candidate.chart
      : null;

  if (!source) {
    return null;
  }

  return {
    title: source.title || candidate.title || 'Proyeccion economica',
    summary: source.summary || candidate.summary || '',
    series: source.series
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        label: String(item.label || item.period || item.x || ''),
        value: Number(item.value ?? item.forecast ?? 0),
        lower: item.lower == null ? null : Number(item.lower),
        upper: item.upper == null ? null : Number(item.upper),
        type: item.type || 'forecast',
      }))
      .filter((item) => item.label && Number.isFinite(item.value)),
  };
}

export function getMessageText(message) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function stripChartBlocks(text) {
  return text
    .replace(chartBlockPattern, (block, rawJson) => {
      try {
        const parsed = JSON.parse(rawJson);
        return tryParseChartObject(parsed) ? '' : block;
      } catch {
        return block;
      }
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function findLatestChartPayload(messages) {
  for (const message of [...messages].reverse()) {
    if (message.role !== 'assistant') {
      continue;
    }

    for (const part of message.parts) {
      if (part.type === 'tool-generate_forecast' && part.state === 'output-available') {
        const chart = tryParseChartObject({
          title: part.output.title,
          summary: part.output.summary,
          series: part.output.series,
        });

        if (chart) {
          return chart;
        }
      }
    }

    const text = getMessageText(message);
    let match = chartBlockPattern.exec(text);

    while (match) {
      try {
        const parsed = JSON.parse(match[1]);
        const chart = tryParseChartObject(parsed);

        if (chart) {
          chartBlockPattern.lastIndex = 0;
          return chart;
        }
      } catch {
        // Ignore invalid JSON snippets.
      }

      match = chartBlockPattern.exec(text);
    }

    chartBlockPattern.lastIndex = 0;
  }

  chartBlockPattern.lastIndex = 0;
  return null;
}

function detectDownloadKind(url, fallbackKind) {
  if (fallbackKind) {
    return fallbackKind;
  }

  if (url.toLowerCase().includes('.xlsx')) {
    return 'excel';
  }

  if (url.toLowerCase().includes('.pdf')) {
    return 'pdf';
  }

  return 'file';
}

function labelForKind(kind) {
  if (kind === 'excel') {
    return 'Descargar Excel';
  }

  if (kind === 'pdf') {
    return 'Descargar PDF';
  }

  return 'Descargar archivo';
}

export function extractDownloadLinks(messages) {
  const map = new Map();

  for (const message of messages) {
    if (message.role !== 'assistant') {
      continue;
    }

    for (const part of message.parts) {
      if (part.type === 'file' && part.url) {
        const kind = detectDownloadKind(part.url);
        map.set(part.url, { url: part.url, kind, label: labelForKind(kind) });
      }

      if (
        (part.type === 'tool-generate_excel' || part.type === 'tool-generate_pdf') &&
        part.state === 'output-available' &&
        part.output?.downloadUrl
      ) {
        const kind = detectDownloadKind(part.output.downloadUrl, part.output.kind);
        map.set(part.output.downloadUrl, {
          url: part.output.downloadUrl,
          kind,
          label: labelForKind(kind),
        });
      }
    }

    const text = getMessageText(message);
    const urls = text.match(urlPattern) || [];

    urls.forEach((url) => {
      const kind = detectDownloadKind(url);

      if (kind !== 'file') {
        map.set(url, { url, kind, label: labelForKind(kind) });
      }
    });
  }

  return Array.from(map.values());
}

export function humanizeToolPart(type) {
  return type.replace('tool-', '').split('_').join(' ');
}

export function getActiveToolInvocations(messages) {
  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');

  if (!lastAssistant) {
    return [];
  }

  return lastAssistant.parts
    .filter((part) => part.type.startsWith('tool-'))
    .filter((part) => part.state === 'input-streaming' || part.state === 'input-available')
    .map((part) => humanizeToolPart(part.type));
}
