import { clearAuthCookie, createAuthCookie, getDefaultSessionExpiry, parseCookies, AUTH_COOKIE_NAME } from './cookies.js';
import { createAuthenticatedSession, deleteAuthenticatedSession, findUserBySessionToken } from './user-profiles.js';

function shouldUseSecureCookie(request) {
  const hostHeader = String(request.headers['x-forwarded-host'] || request.headers.host || '');
  const protocol = String(request.headers['x-forwarded-proto'] || request.protocol || 'http');

  return protocol === 'https' && !/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(hostHeader);
}

export async function getRequestAuth(request) {
  if (request.authContext) {
    return request.authContext;
  }

  const cookies = parseCookies(request.headers.cookie || '');
  const token = cookies[AUTH_COOKIE_NAME] || '';
  const user = token ? await findUserBySessionToken(token) : null;

  request.authContext = { token, user };
  return request.authContext;
}

export async function requireAuthenticatedUser(request, reply) {
  const auth = await getRequestAuth(request);

  if (!auth.user) {
    reply.code(401).send({ error: 'Unauthorized' });
    return null;
  }

  return auth.user;
}

export function setAuthenticatedSession(reply, request, token) {
  reply.header(
    'Set-Cookie',
    createAuthCookie(token, { secure: shouldUseSecureCookie(request) })
  );
}

export function clearAuthenticatedSession(reply, request) {
  reply.header(
    'Set-Cookie',
    clearAuthCookie({ secure: shouldUseSecureCookie(request) })
  );
}

export async function startAuthenticatedSession(reply, request, userId) {
  const expiresAt = getDefaultSessionExpiry();
  const { token } = await createAuthenticatedSession(userId, expiresAt);

  setAuthenticatedSession(reply, request, token);
  request.authContext = { token, user: null };

  return expiresAt;
}

export async function endAuthenticatedSession(request, reply) {
  const auth = await getRequestAuth(request);

  if (auth.token) {
    await deleteAuthenticatedSession(auth.token);
  }

  clearAuthenticatedSession(reply, request);
  request.authContext = { token: '', user: null };
}
