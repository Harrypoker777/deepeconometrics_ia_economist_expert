import { requireAuthenticatedUser } from '../lib/auth.js';
import { checkApiSecret } from '../lib/check-api-secret.js';
import { clearUserSessions, deleteSession, listSessions, loadSession } from '../lib/sessions.js';

export async function registerSessionsRoute(fastify) {
  fastify.get('/api/sessions', { preHandler: checkApiSecret }, async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply);

    if (!user) {
      return;
    }

    const sessions = await listSessions(user.id);
    return { sessions };
  });

  fastify.get('/api/sessions/:id', { preHandler: checkApiSecret }, async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply);

    if (!user) {
      return;
    }

    const messages = await loadSession(request.params.id, user.id);

    if (!messages) {
      return { messages: [] };
    }

    return { messages };
  });

  fastify.delete('/api/sessions/:id', { preHandler: checkApiSecret }, async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply);

    if (!user) {
      return;
    }

    await deleteSession(request.params.id, user.id);
    return { ok: true };
  });

  fastify.delete('/api/sessions', { preHandler: checkApiSecret }, async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply);

    if (!user) {
      return;
    }

    await clearUserSessions(user.id);
    return { ok: true };
  });
}
