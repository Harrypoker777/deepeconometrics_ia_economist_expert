const chartBlockPattern = /```json\s*([\s\S]*?)```/gi;
const urlPattern = /https?:\/\/[^\s)]+/gi;
const fencedBlockPattern = /(```[\s\S]*?```)/g;
const latexDisplayPattern = /\\\[\s*([\s\S]*?)\s*\\\]/g;
const latexInlinePattern = /\\\(\s*([\s\S]*?)\s*\\\)/g;
const bracketMathPattern =
  /\[\s*((?=[^\]]*\\(?:text|frac|left|right|times|approx|cdot|sum|prod|int|sqrt|alpha|beta|gamma|delta|pi|theta|lambda|mu|sigma|Delta|mathrm|operatorname|begin|end))[^\]]+?)\s*\](?!\()/g;
const seriesKeyPattern = /"series"\s*:/;
const chartArtifactCache = new WeakMap();

function getMessageParts(message) {
  if (Array.isArray(message?.parts)) {
    return message.parts;
  }

  if (typeof message?.content === 'string') {
    return [{ type: 'text', text: message.content }];
  }

  return [];
}

function createFallbackMessageId(message, index) {
  const role =
    typeof message?.role === 'string' && message.role.trim()
      ? message.role.trim()
      : 'message';

  return `${role}-${index + 1}`;
}

export function normalizeUiMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  const seenIds = new Map();
  let changed = false;

  const normalizedMessages = messages.map((message, index) => {
    const parts = getMessageParts(message);
    const rawId = typeof message?.id === 'string' ? message.id.trim() : '';
    const baseId = rawId || createFallbackMessageId(message, index);
    const duplicateCount = seenIds.get(baseId) || 0;
    const nextId = duplicateCount === 0 ? baseId : `${baseId}-${duplicateCount + 1}`;

    seenIds.set(baseId, duplicateCount + 1);

    if (nextId !== message?.id || parts !== message?.parts) {
      changed = true;
      return {
        ...message,
        id: nextId,
        parts,
      };
    }

    return message;
  });

  return changed ? normalizedMessages : messages;
}

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

function splitByFencedBlocks(text) {
  const segments = [];
  let lastIndex = 0;

  fencedBlockPattern.lastIndex = 0;
  let match = fencedBlockPattern.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        code: false,
        offset: lastIndex,
      });
    }

    segments.push({
      text: match[0],
      code: true,
      offset: match.index,
    });

    lastIndex = match.index + match[0].length;
    match = fencedBlockPattern.exec(text);
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      code: false,
      offset: lastIndex,
    });
  }

  fencedBlockPattern.lastIndex = 0;

  return segments;
}

function findRawChartObjectsInSegment(text, baseOffset = 0) {
  const matches = [];
  let cursor = 0;

  while (cursor < text.length) {
    const start = text.indexOf('{', cursor);
    if (start === -1) break;

    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let index = start; index < text.length; index += 1) {
      const character = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (character === '\\') {
          escaped = true;
          continue;
        }

        if (character === '"') {
          inString = false;
        }

        continue;
      }

      if (character === '"') {
        inString = true;
        continue;
      }

      if (character === '{') {
        depth += 1;
        continue;
      }

      if (character === '}') {
        depth -= 1;

        if (depth === 0) {
          end = index;
          break;
        }
      }
    }

    if (end === -1) {
      break;
    }

    const candidate = text.slice(start, end + 1);
    let chart = null;

    if (seriesKeyPattern.test(candidate)) {
      try {
        chart = tryParseChartObject(JSON.parse(candidate));
      } catch {
        chart = null;
      }
    }

    seriesKeyPattern.lastIndex = 0;

    if (chart) {
      matches.push({
        start: baseOffset + start,
        end: baseOffset + end + 1,
        chart,
      });
      cursor = end + 1;
      continue;
    }

    cursor = start + 1;
  }

  return matches;
}

function findRawChartObjects(text) {
  const matches = [];

  for (const segment of splitByFencedBlocks(text)) {
    if (segment.code) continue;
    matches.push(...findRawChartObjectsInSegment(segment.text, segment.offset));
  }

  return matches;
}

function stripTextRanges(text, ranges) {
  if (ranges.length === 0) return text;

  return [...ranges]
    .sort((left, right) => right.start - left.start)
    .reduce(
      (current, range) => current.slice(0, range.start) + current.slice(range.end),
      text
    );
}

function createChartArtifactAnchor(messageId, index) {
  const safeMessageId = String(messageId || 'message').replace(/[^a-zA-Z0-9_-]/g, '-');
  return `result-${safeMessageId}-${index + 1}`;
}

function normalizeVisibleText(text) {
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hasPotentialChartPayload(text) {
  return Boolean(text) && (
    text.includes('"series"') ||
    text.includes('```json') ||
    text.includes('"chart"')
  );
}

export function getMessageText(message) {
  return getMessageParts(message)
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function getReasoningText(message) {
  return getMessageParts(message)
    .filter((part) => part.type === 'reasoning')
    .map((part) => part.text || part.reasoning || '')
    .join('\n')
    .trim();
}

export function stripChartBlocks(text) {
  if (!text) return '';

  if (!hasPotentialChartPayload(text)) {
    return normalizeVisibleText(text);
  }

  const withoutFencedCharts = text
    .replace(chartBlockPattern, (block, rawJson) => {
      try {
        const parsed = JSON.parse(rawJson);
        return tryParseChartObject(parsed) ? '' : block;
      } catch {
        return block;
      }
    });

  const rawChartObjects = findRawChartObjects(withoutFencedCharts);
  const cleaned = stripTextRanges(
    withoutFencedCharts,
    rawChartObjects.map((item) => ({ start: item.start, end: item.end }))
  );

  return normalizeVisibleText(cleaned);
}

function normalizeMathContent(content) {
  return content
    .replace(/(^|[^\\])%/g, '$1\\%')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function wrapDisplayMath(content) {
  const normalized = normalizeMathContent(content);
  return normalized ? `\n\n$$\n${normalized}\n$$\n\n` : '';
}

function wrapInlineMath(content) {
  const normalized = normalizeMathContent(content);
  return normalized ? `$${normalized}$` : '';
}

function normalizeMathInSegment(segment) {
  return segment
    .replace(latexDisplayPattern, (_, content) => wrapDisplayMath(content))
    .replace(latexInlinePattern, (_, content) => wrapInlineMath(content))
    .replace(bracketMathPattern, (_, content) => wrapDisplayMath(content))
    .replace(/\n{3,}/g, '\n\n');
}

export function formatAssistantMarkdown(text) {
  if (!text) return '';

  return text
    .split(fencedBlockPattern)
    .map((segment) => (
      segment.startsWith('```') ? segment : normalizeMathInSegment(segment)
    ))
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function findChartArtifactsInMessage(message) {
  if (!message || message.role !== 'assistant') return [];

  const cached = chartArtifactCache.get(message);
  if (cached) {
    return cached;
  }

  const artifacts = [];
  const seen = new Set();

  function push(chart) {
    if (!chart || chart.series.length === 0) return;
    const key = `${chart.title}|${chart.series.length}|${chart.series[0]?.label}|${chart.series[0]?.value}`;
    if (seen.has(key)) return;
    seen.add(key);
    artifacts.push({
      anchorId: createChartArtifactAnchor(message.id, artifacts.length),
      chart,
      messageId: message.id,
      resultType: 'chart',
    });
  }

  for (const part of getMessageParts(message)) {
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
  if (!hasPotentialChartPayload(text)) {
    chartArtifactCache.set(message, artifacts);
    return artifacts;
  }

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

  for (const item of findRawChartObjects(text)) {
    push(item.chart);
  }

  chartArtifactCache.set(message, artifacts);
  return artifacts;
}

export function findChartsInMessage(message) {
  return findChartArtifactsInMessage(message).map((artifact) => artifact.chart);
}

export function extractConversationArtifacts(messages) {
  const artifacts = [];

  for (const message of messages || []) {
    for (const artifact of findChartArtifactsInMessage(message)) {
      artifacts.push({
        ...artifact,
        order: artifacts.length + 1,
      });
    }
  }

  return artifacts;
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

  for (const part of getMessageParts(message)) {
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

  return getMessageParts(lastAssistant)
    .filter((part) => part.type.startsWith('tool-'))
    .filter((part) => part.state === 'input-streaming' || part.state === 'input-available')
    .map((part) => humanizeToolPart(part.type));
}
