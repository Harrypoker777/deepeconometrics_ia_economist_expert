import { DefaultChatTransport } from 'ai';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET || '';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export function getApiBase() {
  if (typeof window === 'undefined') {
    return API_BASE;
  }

  try {
    const resolvedUrl = new URL(API_BASE, window.location.origin);
    const currentHost = window.location.hostname;

    // Keep frontend and backend on the same local host label so auth cookies
    // are treated as same-site in the browser during local development.
    if (
      LOCAL_HOSTS.has(currentHost) &&
      LOCAL_HOSTS.has(resolvedUrl.hostname) &&
      currentHost !== resolvedUrl.hostname
    ) {
      resolvedUrl.hostname = currentHost;
    }

    return resolvedUrl.toString().replace(/\/$/, '');
  } catch {
    return API_BASE;
  }
}

function mergeHeaders(extraHeaders = {}) {
  return {
    ...(API_SECRET ? { 'x-api-secret': API_SECRET } : {}),
    ...extraHeaders,
  };
}

export function apiFetch(path, init = {}) {
  return fetch(`${getApiBase()}${path}`, {
    credentials: 'include',
    ...init,
    headers: mergeHeaders(init.headers || {}),
  });
}

export function createChatTransport(body) {
  return new DefaultChatTransport({
    api: `${getApiBase()}/api/chat`,
    headers: mergeHeaders(),
    credentials: 'include',
    body,
  });
}
