import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { query } from '../db.js';

const AUTH_SCHEMA = 'db_datos_perfiles_usuarios';

function mapUser(row) {
  return {
    id: row.id,
    email: row.correo,
    name: row.correo,
    role: row.rol,
    photoUrl: row.foto_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createUserProfile({ email, passwordHash, role = 'user' }) {
  const id = randomUUID();
  const result = await query(
    `
      INSERT INTO ${AUTH_SCHEMA}.perfiles_usuario (
        id,
        correo,
        password_hash,
        rol
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, correo, rol, foto_url, created_at, updated_at
    `,
    [id, normalizeEmail(email), passwordHash, role]
  );

  return mapUser(result.rows[0]);
}

export async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const result = await query(
    `
      SELECT id, correo, password_hash, rol, foto_url, created_at, updated_at
      FROM ${AUTH_SCHEMA}.perfiles_usuario
      WHERE correo = $1
      LIMIT 1
    `,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    ...mapUser(result.rows[0]),
    passwordHash: result.rows[0].password_hash,
  };
}

export async function createAuthenticatedSession(userId, expiresAt) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(token);

  await query(
    `
      INSERT INTO ${AUTH_SCHEMA}.sesiones_usuario (
        token_hash,
        perfil_usuario_id,
        expires_at
      )
      VALUES ($1, $2, $3)
    `,
    [tokenHash, userId, expiresAt]
  );

  return { token, expiresAt };
}

export async function findUserBySessionToken(token) {
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const result = await query(
    `
      SELECT
        p.id,
        p.correo,
        p.rol,
        p.foto_url,
        p.created_at,
        p.updated_at
      FROM ${AUTH_SCHEMA}.sesiones_usuario s
      INNER JOIN ${AUTH_SCHEMA}.perfiles_usuario p
        ON p.id = s.perfil_usuario_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
      LIMIT 1
    `,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  await query(
    `
      UPDATE ${AUTH_SCHEMA}.sesiones_usuario
      SET updated_at = now()
      WHERE token_hash = $1
    `,
    [tokenHash]
  );

  return mapUser(result.rows[0]);
}

export async function deleteAuthenticatedSession(token) {
  if (!token) {
    return;
  }

  await query(
    `
      DELETE FROM ${AUTH_SCHEMA}.sesiones_usuario
      WHERE token_hash = $1
    `,
    [hashSessionToken(token)]
  );
}
