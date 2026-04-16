import { randomUUID } from 'node:crypto';
import { query } from '../db.js';
import { hashPassword } from '../lib/passwords.js';
import { findUserByEmail, normalizeEmail } from '../lib/user-profiles.js';

const AUTH_SCHEMA = 'db_datos_perfiles_usuarios';
const DEFAULT_SUPERUSER_EMAIL = 'alinavarro2023@gmail.com';
const DEFAULT_SUPERUSER_PASSWORD = 'Alijesus1*';

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
  await ensureAuthSchema();
  await ensureChatOwnershipColumns();

  await query(
    `
      DELETE FROM ${AUTH_SCHEMA}.sesiones_usuario
      WHERE expires_at <= now()
    `
  );

  await ensureDefaultSuperuser();
}
