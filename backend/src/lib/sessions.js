import { query } from '../db.js';

export async function saveSessionSnapshot({ sessionId, userId, messages }) {
  if (!sessionId || !userId) {
    return null;
  }

  const result = await query(
    `
      INSERT INTO sesiones (session_id, perfil_usuario_id, messages)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (session_id)
      DO UPDATE SET
        messages = EXCLUDED.messages,
        updated_at = now()
      WHERE sesiones.perfil_usuario_id = EXCLUDED.perfil_usuario_id
      RETURNING session_id
    `,
    [sessionId, userId, JSON.stringify(messages || [])]
  );

  if (result.rowCount === 0) {
    throw new Error('Session does not belong to the authenticated user.');
  }

  return result.rows[0].session_id;
}

export async function listSessions(userId) {
  if (!userId) {
    return [];
  }

  const { rows } = await query(
    `
      SELECT
        session_id,
        created_at,
        updated_at,
        COALESCE(
          messages->0->'parts'->0->>'text',
          messages->0->>'content',
          ''
        ) AS first_user_message
      FROM sesiones
      WHERE perfil_usuario_id = $1
      ORDER BY updated_at DESC
      LIMIT 50
    `,
    [userId]
  );

  return rows.map((row) => ({
    sessionId: row.session_id,
    title: (row.first_user_message || '').slice(0, 80) || 'Nueva conversacion',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function loadSession(sessionId, userId) {
  if (!sessionId || !userId) {
    return null;
  }

  const { rows } = await query(
    `
      SELECT messages
      FROM sesiones
      WHERE session_id = $1
        AND perfil_usuario_id = $2
    `,
    [sessionId, userId]
  );

  return rows.length > 0 ? rows[0].messages : null;
}

export async function deleteSession(sessionId, userId) {
  if (!sessionId || !userId) {
    return;
  }

  await query(
    `
      DELETE FROM sesiones
      WHERE session_id = $1
        AND perfil_usuario_id = $2
    `,
    [sessionId, userId]
  );
}

export async function clearUserSessions(userId) {
  if (!userId) {
    return;
  }

  await query(
    `
      DELETE FROM sesiones
      WHERE perfil_usuario_id = $1
    `,
    [userId]
  );
}
