import { endAuthenticatedSession, getRequestAuth, startAuthenticatedSession } from '../lib/auth.js';
import { checkApiSecret } from '../lib/check-api-secret.js';
import { hashPassword, validatePassword, verifyPassword } from '../lib/passwords.js';
import { createUserProfile, findUserByEmail, isValidEmail, normalizeEmail } from '../lib/user-profiles.js';

function getSafeUser(user) {
  if (!user) {
    return null;
  }

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function readBody(request) {
  return request.body && typeof request.body === 'object' ? request.body : {};
}

export async function registerAuthRoute(fastify) {
  fastify.get('/api/auth/me', { preHandler: checkApiSecret }, async (request) => {
    const auth = await getRequestAuth(request);
    return { user: getSafeUser(auth.user) };
  });

  fastify.post('/api/auth/register', { preHandler: checkApiSecret }, async (request, reply) => {
    const body = readBody(request);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

    if (!email || !isValidEmail(email)) {
      return reply.code(400).send({ error: 'Debes indicar un correo valido.' });
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      return reply.code(400).send({ error: passwordError });
    }

    if (password !== confirmPassword) {
      return reply.code(400).send({ error: 'La confirmacion de contrasena no coincide.' });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return reply.code(409).send({ error: 'Ya existe una cuenta con ese correo.' });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUserProfile({ email, passwordHash });
    const expiresAt = await startAuthenticatedSession(reply, request, user.id);

    return {
      user,
      expiresAt,
    };
  });

  fastify.post('/api/auth/login', { preHandler: checkApiSecret }, async (request, reply) => {
    const body = readBody(request);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    const user = await findUserByEmail(email);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Correo o contrasena incorrectos.' });
    }

    const expiresAt = await startAuthenticatedSession(reply, request, user.id);

    return {
      user: getSafeUser(user),
      expiresAt,
    };
  });

  fastify.post('/api/auth/logout', { preHandler: checkApiSecret }, async (request, reply) => {
    await endAuthenticatedSession(request, reply);
    return { ok: true };
  });
}
