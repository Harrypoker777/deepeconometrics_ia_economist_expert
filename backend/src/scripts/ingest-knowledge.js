#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDatabaseSetup } from '../bootstrap/database.js';
import { closePool } from '../db.js';
import { hasVectorExtension, upsertDocument } from '../lib/knowledge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '../../../knowledge');

function parseFrontmatter(raw) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) return { data: {}, body: raw };
  const yaml = match[1];
  const body = raw.slice(match[0].length);
  const data = {};
  const lines = yaml.split('\n');
  let currentKey = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^[-\s]/.test(line) && currentKey) {
      const item = line.replace(/^\s*-\s*/, '').trim();
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(item);
      continue;
    }
    const kv = /^([a-zA-Z0-9_]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    currentKey = kv[1];
    const value = kv[2].trim();
    if (value === '' || value === '[]') {
      data[currentKey] = value === '[]' ? [] : '';
      continue;
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      data[currentKey] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      continue;
    }
    data[currentKey] = value.replace(/^["']|["']$/g, '');
  }
  return { data, body };
}

async function walk(dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const name of entries) {
    const full = path.join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (full.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ROOT;
  console.log(`[ingest] root=${root}`);

  const { vectorAvailable } = await ensureDatabaseSetup();
  const hasVector = vectorAvailable && (await hasVectorExtension());
  console.log(`[ingest] pgvector=${hasVector ? 'yes' : 'no'}`);
  if (!hasVector) {
    console.log('[ingest] Running without embeddings. Search will fall back to keyword matching.');
  }

  let files;
  try {
    files = await walk(root);
  } catch (error) {
    console.error(`[ingest] Cannot read ${root}:`, error.message);
    process.exit(1);
  }

  console.log(`[ingest] discovered ${files.length} markdown files`);

  let total = 0;
  let totalChunks = 0;
  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const relative = path.relative(root, file).replace(/\\/g, '/');
    const slug = data.slug || relative.replace(/\.md$/, '').replace(/\//g, '__');
    const title = data.title || path.basename(file, '.md');
    const category = data.category || path.dirname(relative).split('/')[0] || 'general';

    const result = await upsertDocument({
      slug,
      title,
      category,
      source: data.source,
      author: data.author,
      tags: data.tags || [],
      content: body,
      metadata: data,
    });
    total += 1;
    totalChunks += result.chunks || 0;
    console.log(`  + ${slug} (${result.chunks} chunks, embedded=${result.embedded || 0})`);
  }

  console.log(`[ingest] done. docs=${total} chunks=${totalChunks}`);
  await closePool();
}

main().catch(async (error) => {
  console.error('[ingest] fatal', error);
  await closePool().catch(() => null);
  process.exit(1);
});
