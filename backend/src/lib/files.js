import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { query } from '../db.js';

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function getPublicBaseUrl(request) {
  const forwardedProto = request.headers['x-forwarded-proto'];
  const forwardedHost = request.headers['x-forwarded-host'];
  const protocol = forwardedProto || request.protocol || 'http';
  const host = forwardedHost || request.headers.host || `127.0.0.1:${config.port}`;
  return `${protocol}://${host}`;
}

export async function ensureGeneratedFilesDir() {
  await fs.mkdir(config.generatedFilesDir, { recursive: true });
}

export async function storeGeneratedFile({ request, sessionId, fileKind, suggestedName, mimeType, buffer, metadata }) {
  await ensureGeneratedFilesDir();

  const fileId = randomUUID();
  const extension = fileKind === 'excel' ? 'xlsx' : 'pdf';
  const fileName = `${fileId}-${slugify(suggestedName || `${fileKind}-forecast`)}.${extension}`;
  const filePath = path.join(config.generatedFilesDir, fileName);

  await fs.writeFile(filePath, buffer);

  await query(
    `
      INSERT INTO archivos_generados (
        id,
        session_id,
        tipo,
        nombre_archivo,
        ruta_archivo,
        mime_type,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      fileId,
      sessionId || null,
      fileKind,
      fileName,
      filePath,
      mimeType,
      JSON.stringify(metadata || {}),
    ]
  );

  return {
    fileId,
    fileName,
    filePath,
    downloadUrl: `${getPublicBaseUrl(request)}/files/${fileId}`,
  };
}

export async function findGeneratedFile(fileId) {
  const result = await query(
    `
      SELECT id, session_id, tipo, nombre_archivo, ruta_archivo, mime_type, metadata, created_at
      FROM archivos_generados
      WHERE id = $1
      LIMIT 1
    `,
    [fileId]
  );

  return result.rows[0] || null;
}

export async function createFileStream(filePath) {
  await fs.access(filePath);
  return createReadStream(filePath);
}
