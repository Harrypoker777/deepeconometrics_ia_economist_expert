import { randomUUID } from 'node:crypto';
import { query } from '../db.js';
import { embedBatch, embedText, toPgVector } from './embeddings.js';

export async function hasVectorExtension() {
  try {
    const result = await query(
      `SELECT 1 FROM pg_extension WHERE extname = 'vector' LIMIT 1`
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

function buildChunkHash(slug, chunkIndex, content) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  return `${slug}::${chunkIndex}::${normalized.length}`;
}

const STOPWORD_TOKENS = new Set([
  'como',
  'con',
  'cual',
  'cuales',
  'del',
  'desde',
  'donde',
  'entre',
  'esta',
  'este',
  'estos',
  'estas',
  'hasta',
  'las',
  'los',
  'para',
  'pero',
  'por',
  'que',
  'segun',
  'sin',
  'sobre',
  'sus',
  'una',
  'uno',
  'unos',
  'unas',
]);

function normalizeRankingText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function tokenizeRankingText(value = '') {
  return [...new Set(
    normalizeRankingText(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3)
      .filter((token) => !STOPWORD_TOKENS.has(token))
  )];
}

function matchedTokens(haystack, tokens) {
  return tokens.filter((token) => haystack.includes(token));
}

function rerankKnowledgeRows(rows, cleanQuery, limit) {
  const normalizedQuery = normalizeRankingText(cleanQuery);
  const tokens = tokenizeRankingText(cleanQuery);

  return rows
    .map((row) => {
      const title = normalizeRankingText(row.title);
      const content = normalizeRankingText(row.content);
      const tags = normalizeRankingText(Array.isArray(row.tags) ? row.tags.join(' ') : '');
      const slug = normalizeRankingText(row.slug);
      const rawSimilarity = typeof row.similarity === 'number' ? row.similarity : 0;
      const titleMatches = matchedTokens(title, tokens);
      const contentMatches = matchedTokens(content, tokens);
      const metadataMatches = matchedTokens(`${tags} ${slug}`, tokens);
      const titleHits = titleMatches.length;
      const contentHits = contentMatches.length;
      const metadataHits = metadataMatches.length;
      const contentOnlyHits = contentMatches.filter((token) => !titleMatches.includes(token)).length;
      const allTokensInTitle = tokens.length > 0 && titleHits === tokens.length;
      const allTokensInContent = tokens.length > 0 && contentHits === tokens.length;

      let score = rawSimilarity;

      if (normalizedQuery && title.includes(normalizedQuery)) {
        score += 0.45;
      }

      if (normalizedQuery && content.includes(normalizedQuery)) {
        score += 0.18;
      }

      if (allTokensInTitle) {
        score += 0.3;
      }

      if (allTokensInContent) {
        score += 0.12;
      }

      if (titleHits > 0 && contentOnlyHits > 0) {
        score += 0.18;
      }

      score += Math.min(titleHits * 0.06, 0.24);
      score += Math.min(metadataHits * 0.05, 0.2);
      score += Math.min(contentHits * 0.03, 0.24);
      score += Math.min(contentOnlyHits * 0.07, 0.28);
      score += Math.max(0, 0.05 - ((row.chunk_index || 0) * 0.0025));

      return {
        ...row,
        similarity: score,
      };
    })
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit);
}

function mergeKnowledgeRows(...collections) {
  const merged = new Map();

  for (const row of collections.flat()) {
    const key = row.chunk_id || `${row.slug}::${row.chunk_index}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, row);
      continue;
    }

    const currentSimilarity = typeof row.similarity === 'number' ? row.similarity : Number.NEGATIVE_INFINITY;
    const existingSimilarity = typeof existing.similarity === 'number' ? existing.similarity : Number.NEGATIVE_INFINITY;

    if (currentSimilarity > existingSimilarity) {
      merged.set(key, { ...existing, ...row });
    }
  }

  return [...merged.values()];
}

async function queryLexicalKnowledgeRows({ patterns, limit, category }) {
  const params = [patterns, limit];
  const categoryFilter = category ? 'AND d.category = $3' : '';
  if (category) params.push(category);

  const result = await query(
    `
      SELECT
        c.id AS chunk_id,
        c.chunk_index,
        c.content,
        d.slug,
        d.title,
        d.category,
        d.source,
        d.author,
        d.tags,
        NULL::float AS similarity
      FROM kb_chunks c
      JOIN kb_documents d ON d.id = c.document_id
      WHERE (
        c.content ILIKE ANY($1::text[])
        OR d.title ILIKE ANY($1::text[])
        OR EXISTS (
          SELECT 1
          FROM unnest(COALESCE(d.tags, ARRAY[]::text[])) AS tag
          WHERE tag ILIKE ANY($1::text[])
        )
      ) ${categoryFilter}
      ORDER BY
        (
          (SELECT COUNT(*) FROM unnest($1::text[]) AS pattern WHERE d.title ILIKE pattern) * 3
          + (SELECT COUNT(*) FROM unnest($1::text[]) AS pattern WHERE c.content ILIKE pattern)
          + (
            SELECT COUNT(*)
            FROM unnest($1::text[]) AS pattern
            WHERE EXISTS (
              SELECT 1
              FROM unnest(COALESCE(d.tags, ARRAY[]::text[])) AS tag
              WHERE tag ILIKE pattern
            )
          ) * 2
        ) DESC,
        d.updated_at DESC,
        c.chunk_index ASC
      LIMIT $2
    `,
    params
  );

  return result.rows;
}

export function splitMarkdownIntoChunks(markdown, { maxChars = 1400, overlap = 200 } = {}) {
  const cleaned = markdown.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];

  const sections = [];
  const lines = cleaned.split('\n');
  let buffer = [];
  let currentHeading = '';

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.*)/.exec(line);
    if (headingMatch && buffer.length > 0) {
      sections.push({ heading: currentHeading, body: buffer.join('\n').trim() });
      buffer = [];
      currentHeading = headingMatch[2].trim();
      continue;
    }
    if (headingMatch) {
      currentHeading = headingMatch[2].trim();
      continue;
    }
    buffer.push(line);
  }
  if (buffer.length > 0) {
    sections.push({ heading: currentHeading, body: buffer.join('\n').trim() });
  }

  const chunks = [];
  for (const section of sections) {
    if (!section.body) continue;
    const prefix = section.heading ? `# ${section.heading}\n\n` : '';
    const paragraphs = section.body.split(/\n{2,}/);
    let current = prefix;

    for (const paragraph of paragraphs) {
      const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
      if (candidate.length <= maxChars) {
        current = candidate;
        continue;
      }
      if (current.trim()) chunks.push(current.trim());
      if (paragraph.length <= maxChars) {
        const tail = current.slice(Math.max(0, current.length - overlap));
        current = `${prefix}${tail}\n\n${paragraph}`;
      } else {
        for (let i = 0; i < paragraph.length; i += maxChars - overlap) {
          chunks.push(`${prefix}${paragraph.slice(i, i + maxChars)}`.trim());
        }
        current = prefix;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }

  return chunks;
}

export async function upsertDocument({ slug, title, category, source, author, tags, content, metadata }) {
  const existing = await query('SELECT id FROM kb_documents WHERE slug = $1', [slug]);
  const documentId = existing.rows[0]?.id || randomUUID();

  await query(
    `
      INSERT INTO kb_documents (id, slug, title, category, source, author, tags, content, metadata, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        source = EXCLUDED.source,
        author = EXCLUDED.author,
        tags = EXCLUDED.tags,
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        updated_at = now()
    `,
    [
      documentId,
      slug,
      title,
      category || null,
      source || null,
      author || null,
      Array.isArray(tags) ? tags : [],
      content,
      metadata ? JSON.stringify(metadata) : '{}',
    ]
  );

  await query('DELETE FROM kb_chunks WHERE document_id = $1', [documentId]);

  const chunks = splitMarkdownIntoChunks(content);
  if (chunks.length === 0) return { documentId, chunks: 0 };

  const vectorAvailable = await hasVectorExtension();
  let embeddings = [];
  if (vectorAvailable) {
    try {
      embeddings = await embedBatch(chunks);
    } catch (error) {
      embeddings = [];
    }
  }

  for (let i = 0; i < chunks.length; i += 1) {
    const chunkId = randomUUID();
    const chunkContent = chunks[i];
    const chunkHash = buildChunkHash(slug, i, chunkContent);
    const embedding = embeddings[i];

    if (vectorAvailable && embedding) {
      await query(
        `
          INSERT INTO kb_chunks (id, document_id, chunk_index, content, content_hash, embedding)
          VALUES ($1, $2, $3, $4, $5, $6::vector)
        `,
        [chunkId, documentId, i, chunkContent, chunkHash, toPgVector(embedding)]
      );
    } else {
      await query(
        `
          INSERT INTO kb_chunks (id, document_id, chunk_index, content, content_hash)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [chunkId, documentId, i, chunkContent, chunkHash]
      );
    }
  }

  return { documentId, chunks: chunks.length, embedded: embeddings.length };
}

export async function searchKnowledge({ q, limit = 6, category = null }) {
  const cleanQuery = (q || '').trim();
  if (!cleanQuery) return [];
  const candidateLimit = Math.max(limit * 8, 24);
  const tokens = tokenizeRankingText(cleanQuery);
  const ilikePatterns = (tokens.length > 0 ? tokens : [cleanQuery]).map((token) => `%${token}%`);

  const vectorAvailable = await hasVectorExtension();
  let embedding = null;

  if (vectorAvailable) {
    try {
      embedding = await embedText(cleanQuery);
    } catch {
      embedding = null;
    }
  }

  if (embedding) {
    const params = [toPgVector(embedding), candidateLimit];
    const categoryFilter = category ? 'AND d.category = $3' : '';
    if (category) params.push(category);

    const result = await query(
      `
        SELECT
          c.id AS chunk_id,
          c.chunk_index,
          c.content,
          d.slug,
          d.title,
          d.category,
          d.source,
          d.author,
          d.tags,
          1 - (c.embedding <=> $1::vector) AS similarity
        FROM kb_chunks c
        JOIN kb_documents d ON d.id = c.document_id
        WHERE c.embedding IS NOT NULL ${categoryFilter}
        ORDER BY c.embedding <=> $1::vector
        LIMIT $2
      `,
      params
    );
    const lexicalRows = await queryLexicalKnowledgeRows({
      patterns: ilikePatterns,
      limit: candidateLimit,
      category,
    });

    return rerankKnowledgeRows(
      mergeKnowledgeRows(result.rows, lexicalRows),
      cleanQuery,
      limit
    );
  }

  const lexicalRows = await queryLexicalKnowledgeRows({
    patterns: ilikePatterns,
    limit: candidateLimit,
    category,
  });

  return rerankKnowledgeRows(lexicalRows, cleanQuery, limit);
}

export async function listKnowledgeCategories() {
  const result = await query(
    `
      SELECT category, COUNT(*)::int AS documents, MAX(updated_at) AS updated_at
      FROM kb_documents
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY category
    `
  );
  return result.rows;
}

export async function listKnowledgeDocuments({ category = null, limit = 50 } = {}) {
  const params = [limit];
  const filter = category ? 'WHERE category = $2' : '';
  if (category) params.push(category);
  const result = await query(
    `
      SELECT slug, title, category, source, author, tags, updated_at
      FROM kb_documents
      ${filter}
      ORDER BY updated_at DESC
      LIMIT $1
    `,
    params
  );
  return result.rows;
}
