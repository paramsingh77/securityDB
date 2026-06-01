const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export function getToken() {
  return window.localStorage.getItem('hsp_token');
}

export function setToken(token) {
  window.localStorage.setItem('hsp_token', token);
}

export function clearToken() {
  window.localStorage.removeItem('hsp_token');
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

