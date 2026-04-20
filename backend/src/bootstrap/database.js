import { randomUUID } from 'node:crypto';
import { query } from '../db.js';
import { hashPassword } from '../lib/passwords.js';
import { findUserByEmail, normalizeEmail } from '../lib/user-profiles.js';

const AUTH_SCHEMA = 'db_datos_perfiles_usuarios';
const DEFAULT_SUPERUSER_EMAIL = 'alinavarro2023@gmail.com';
const DEFAULT_SUPERUSER_PASSWORD = 'Alijesus1*';

async function ensureVectorExtension() {
  try {
    await query('CREATE EXTENSION IF NOT EXISTS vector');
    return true;
  } catch (error) {
    return false;
  }
}

async function ensureKnowledgeBase(vectorAvailable) {
  await query(
    `
      CREATE TABLE IF NOT EXISTS kb_documents (
        id UUID PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        category TEXT,
        source TEXT,
        author TEXT,
        tags TEXT[] NOT NULL DEFAULT '{}',
        content TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
  );

  await query(
    `
      CREATE TABLE IF NOT EXISTS kb_chunks (
        id UUID PRIMARY KEY,
        document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
  );

  await query(
    `
      CREATE INDEX IF NOT EXISTS kb_chunks_document_idx
      ON kb_chunks (document_id, chunk_index)
    `
  );

  await query(
    `
      CREATE INDEX IF NOT EXISTS kb_documents_category_idx
      ON kb_documents (category)
    `
  );

  if (vectorAvailable) {
    await query(`ALTER TABLE kb_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536)`);

    try {
      await query(
        `
          CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx
          ON kb_chunks USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100)
        `
      );
    } catch {
      // ivfflat index might fail on empty tables; ignore.
    }
  }

  await query(
    `
      CREATE TABLE IF NOT EXISTS fuentes_datos_log (
        id UUID PRIMARY KEY,
        source TEXT NOT NULL,
        codigo TEXT NOT NULL,
        params JSONB NOT NULL DEFAULT '{}'::jsonb,
        rows_inserted INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
  );

  await query(
    `
      CREATE INDEX IF NOT EXISTS fuentes_datos_log_source_idx
      ON fuentes_datos_log (source, codigo, created_at DESC)
    `
  );
}

async function ensureIndicatorMetadata() {
  await query(`ALTER TABLE indicadores ADD COLUMN IF NOT EXISTS pais TEXT`);
  await query(`ALTER TABLE indicadores ADD COLUMN IF NOT EXISTS fuente TEXT`);
  await query(`ALTER TABLE indicadores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
}

async function ensureAuthSchema() {
  await query(`CREATE SCHEMA IF NOT EXISTS ${AUTH_SCHEMA}`);

  await query(
    `
      CREATE TABLE IF NOT EXISTS ${AUTH_SCHEMA}.perfiles_usuario (
        id UUID PRIMARY KEY,
        correo TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        rol TEXT NOT NULL DEFAULT 'user',
        foto_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
  );

  await query(
    `
      CREATE TABLE IF NOT EXISTS ${AUTH_SCHEMA}.sesiones_usuario (
        token_hash TEXT PRIMARY KEY,
        perfil_usuario_id UUID NOT NULL REFERENCES ${AUTH_SCHEMA}.perfiles_usuario(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
  );

  await query(
    `
      CREATE INDEX IF NOT EXISTS sesiones_usuario_perfil_idx
      ON ${AUTH_SCHEMA}.sesiones_usuario (perfil_usuario_id, created_at DESC)
    `
  );

  await query(
    `
      CREATE INDEX IF NOT EXISTS sesiones_usuario_expires_idx
      ON ${AUTH_SCHEMA}.sesiones_usuario (expires_at)
    `
  );
}

async function ensureChatOwnershipColumns() {
  await query(
    `
      ALTER TABLE sesiones
      ADD COLUMN IF NOT EXISTS perfil_usuario_id UUID
    `
  );

  await query(
    `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'sesiones_perfil_usuario_id_fkey'
        ) THEN
          ALTER TABLE sesiones
          ADD CONSTRAINT sesiones_perfil_usuario_id_fkey
          FOREIGN KEY (perfil_usuario_id)
          REFERENCES ${AUTH_SCHEMA}.perfiles_usuario(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `
  );

  await query(
    `
      CREATE INDEX IF NOT EXISTS sesiones_perfil_usuario_id_updated_idx
      ON sesiones (perfil_usuario_id, updated_at DESC)
    `
  );
}

async function ensureDefaultSuperuser() {
  const existingUser = await findUserByEmail(DEFAULT_SUPERUSER_EMAIL);

  if (existingUser) {
    return;
  }

  const passwordHash = await hashPassword(DEFAULT_SUPERUSER_PASSWORD);

  await query(
    `
      INSERT INTO ${AUTH_SCHEMA}.perfiles_usuario (
        id,
        correo,
        password_hash,
        rol
      )
      VALUES ($1, $2, $3, $4)
    `,
    [
      randomUUID(),
      normalizeEmail(DEFAULT_SUPERUSER_EMAIL),
      passwordHash,
      'superusuario',
    ]
  );
}

export async function ensureDatabaseSetup() {
  const vectorAvailable = await ensureVectorExtension();
  await ensureAuthSchema();
  await ensureChatOwnershipColumns();
  await ensureIndicatorMetadata();
  await ensureKnowledgeBase(vectorAvailable);

  await query(
    `
      DELETE FROM ${AUTH_SCHEMA}.sesiones_usuario
      WHERE expires_at <= now()
    `
  );

  await ensureDefaultSuperuser();

  return { vectorAvailable };
}
