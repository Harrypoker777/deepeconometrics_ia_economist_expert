export const AUTH_COOKIE_NAME = 'deepeconometrics_auth';

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge != null) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  if (options.expires instanceof Date) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  parts.push(`Path=${options.path || '/'}`);

  if (options.httpOnly !== false) {
    parts.push('HttpOnly');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, part) => {
      const separatorIndex = part.indexOf('=');

      if (separatorIndex <= 0) {
        return accumulator;
      }

      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();

      accumulator[name] = decodeURIComponent(value);
      return accumulator;
    }, {});
}

export function createAuthCookie(token, { secure = false } = {}) {
  return serializeCookie(AUTH_COOKIE_NAME, token, {
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'Lax',
    secure,
  });
}

export function clearAuthCookie({ secure = false } = {}) {
  return serializeCookie(AUTH_COOKIE_NAME, '', {
    maxAge: 0,
    expires: new Date(0),
    path: '/',
    sameSite: 'Lax',
    secure,
  });
}

export function getDefaultSessionExpiry() {
  return new Date(Date.now() + AUTH_COOKIE_MAX_AGE_SECONDS * 1000);
}
