import { config } from '../config.js';

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

const EMBEDDING_CACHE_LIMIT = 256;
const embeddingCache = new Map();

function normalizeCacheKey(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function rememberEmbedding(key, vector) {
  if (embeddingCache.has(key)) {
    embeddingCache.delete(key);
  }
  embeddingCache.set(key, vector);
  if (embeddingCache.size > EMBEDDING_CACHE_LIMIT) {
    const oldestKey = embeddingCache.keys().next().value;
    if (oldestKey !== undefined) embeddingCache.delete(oldestKey);
  }
}

export class EmbeddingError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'EmbeddingError';
    if (cause) this.cause = cause;
  }
}

export function hasEmbeddingProvider() {
  return Boolean(config.openaiApiKey);
}

export async function embedText(input) {
  const key = normalizeCacheKey(input);
  if (key && embeddingCache.has(key)) {
    const cached = embeddingCache.get(key);
    embeddingCache.delete(key);
    embeddingCache.set(key, cached);
    return cached;
  }

  const [vector] = await embedBatch([input]);
  if (key && vector) {
    rememberEmbedding(key, vector);
  }
  return vector;
}

export async function embedBatch(inputs) {
  if (!config.openaiApiKey) {
    throw new EmbeddingError('OPENAI_API_KEY missing: cannot compute embeddings.');
  }

  const cleaned = inputs
    .map((value) => (typeof value === 'string' ? value : ''))
    .map((value) => value.replace(/\s+/g, ' ').trim().slice(0, 8000))
    .filter((value) => value.length > 0);

  if (cleaned.length === 0) return [];

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: cleaned }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new EmbeddingError(`OpenAI embeddings failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  return payload.data.map((row) => row.embedding);
}

export function toPgVector(values) {
  return `[${values.map((value) => Number(value).toFixed(7)).join(',')}]`;
}
