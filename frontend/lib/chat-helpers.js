const chartBlockPattern = /```json\s*([\s\S]*?)```/gi;
const urlPattern = /https?:\/\/[^\s)]+/gi;

export const INDICATOR_PROMPTS = [
  {
    label: 'Inflacion (IPC)',
    description: 'Tendencia reciente y forecast a 12 meses.',
    prompt:
      'Consulta el indicador IPC, explica la tendencia reciente con perspectiva monetarista (Friedman) y genera un forecast a 12 meses usando generate_forecast.',
  },
  {
    label: 'PIB y crecimiento',
    description: 'Actividad economica con proyeccion a 6 anos.',
    prompt:
      'Consulta el PIB, resume los drivers recientes apoyandote en contabilidad del crecimiento a la Solow y proyecta 6 periodos con generate_forecast.',
  },
  {
    label: 'Buscar teoria',
    description: 'Pregunta abierta al RAG de laureados Nobel.',
    prompt:
      'Que opinan los laureados Nobel sobre el rol de la politica monetaria frente a la inflacion? Usa search_knowledge_base antes de responder.',
  },
  {
    label: 'Reporte descargable',
    description: 'Forecast con Excel y PDF.',
    prompt:
      'Consulta el IPC, genera un forecast a 6 periodos, exporta Excel y PDF descargables con el resultado.',
  },
];

function tryParseChartObject(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;

  const source = Array.isArray(candidate.series)
    ? candidate
    : candidate.chart && Array.isArray(candidate.chart.series)
      ? candidate.chart
      : null;

  if (!source) return null;

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

export function getReasoningText(message) {
  return message.parts
    .filter((part) => part.type === 'reasoning')
    .map((part) => part.text || part.reasoning || '')
    .join('\n')
    .trim();
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

export function findChartsInMessage(message) {
  if (!message || message.role !== 'assistant') return [];

  const charts = [];
  const seen = new Set();

  function push(chart) {
    if (!chart || chart.series.length === 0) return;
    const key = `${chart.title}|${chart.series.length}|${chart.series[0]?.label}|${chart.series[0]?.value}`;
    if (seen.has(key)) return;
    seen.add(key);
    charts.push(chart);
  }

  for (const part of message.parts || []) {
    if (part.type === 'tool-generate_forecast' && part.state === 'output-available') {
      push(
        tryParseChartObject({
          title: part.output?.title,
          summary: part.output?.summary,
          series: part.output?.series,
        })
      );
    }

    if (part.type === 'tool-generate_chart' && part.state === 'output-available') {
      push(tryParseChartObject(part.output?.chart || part.output));
    }
  }

  const text = getMessageText(message);
  chartBlockPattern.lastIndex = 0;
  let match = chartBlockPattern.exec(text);

  while (match) {
    try {
      push(tryParseChartObject(JSON.parse(match[1])));
    } catch {
      /* noop */
    }

    match = chartBlockPattern.exec(text);
  }

  chartBlockPattern.lastIndex = 0;

  return charts;
}

function detectDownloadKind(url, fallbackKind) {
  if (fallbackKind) return fallbackKind;
  if (url.toLowerCase().includes('.xlsx')) return 'excel';
  if (url.toLowerCase().includes('.pdf')) return 'pdf';
  return 'file';
}

function labelForKind(kind) {
  if (kind === 'excel') return 'Descargar Excel';
  if (kind === 'pdf') return 'Descargar PDF';
  return 'Descargar archivo';
}

export function findDownloadsInMessage(message) {
  if (!message || message.role !== 'assistant') return [];

  const map = new Map();

  for (const part of message.parts || []) {
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
  (text.match(urlPattern) || []).forEach((url) => {
    const kind = detectDownloadKind(url);
    if (kind !== 'file') {
      map.set(url, { url, kind, label: labelForKind(kind) });
    }
  });

  return Array.from(map.values());
}

export function extractDownloadLinks(messages) {
  const map = new Map();

  for (const message of messages) {
    for (const entry of findDownloadsInMessage(message)) {
      map.set(entry.url, entry);
    }
  }

  return Array.from(map.values());
}

export function humanizeToolPart(type) {
  const name = type.replace('tool-', '').replace(/_/g, ' ');
  const labels = {
    'search knowledge base': 'Buscando en la base de conocimiento',
    'list knowledge topics': 'Listando temas',
    'read indicators': 'Leyendo indicadores',
    'ingest external series': 'Descargando serie externa',
    'generate forecast': 'Generando forecast',
    'generate chart': 'Preparando grafico',
    'generate excel': 'Creando Excel',
    'generate pdf': 'Creando PDF',
  };

  return labels[name] || name;
}

export function summarizeToolCall(part) {
  const label = humanizeToolPart(part.type);
  const running = part.state === 'input-streaming' || part.state === 'input-available';
  const done = part.state === 'output-available';

  return { label, running, done, state: part.state };
}

export function getActiveToolInvocations(messages) {
  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
  if (!lastAssistant) return [];

  return lastAssistant.parts
    .filter((part) => part.type.startsWith('tool-'))
    .filter((part) => part.state === 'input-streaming' || part.state === 'input-available')
    .map((part) => humanizeToolPart(part.type));
}
