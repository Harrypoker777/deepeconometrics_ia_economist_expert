import { DefaultChatTransport } from 'ai';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET || '';

function mergeHeaders(extraHeaders = {}) {
  return {
    ...(API_SECRET ? { 'x-api-secret': API_SECRET } : {}),
    ...extraHeaders,
  };
}

export function apiFetch(path, init = {}) {
  return fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: mergeHeaders(init.headers || {}),
  });
}

export function createChatTransport(body) {
  return new DefaultChatTransport({
    api: `${API_BASE}/api/chat`,
    headers: mergeHeaders(),
    credentials: 'include',
    body,
  });
}
