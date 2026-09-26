// Small client for the StockSense backend (see backend/API.md).
// In development Vite forwards /api to the backend (vite.config.js).
// For a separate deployment set VITE_API_URL, e.g. https://api.example.com/api
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'stocksense_token';
const USER_KEY = 'stocksense_user';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Session (token + user). "Remember me" keeps it in localStorage, otherwise
// sessionStorage (cleared when the browser is closed).
// ---------------------------------------------------------------------------
let unauthorizedHandler = null;

function readStored(key) {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getToken() {
  return readStored(TOKEN_KEY);
}

export function getUser() {
  try {
    return JSON.parse(readStored(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function isManager() {
  return getUser()?.role === 'manager';
}

export function setSession(token, user, remember) {
  clearSession();
  const store = remember === false ? sessionStorage : localStorage;
  try {
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable (private mode) - the session lasts until reload */
  }
}

/** Updates the stored user (and optionally token) in whichever storage holds the session. */
export function updateSession({ user, token }) {
  try {
    const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
    if (user) store.setItem(USER_KEY, JSON.stringify(user));
    if (token) store.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearSession() {
  for (const store of [localStorage, sessionStorage]) {
    try {
      store.removeItem(TOKEN_KEY);
      store.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Called when the backend says the token is no longer valid (401). */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------
/** Builds "?a=1&b=2", skipping empty values. */
export function qs(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/auth/login')) {
      clearSession();
      unauthorizedHandler?.();
    }
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`, data?.details);
  }
  return data;
}

export const api = {
  get: (path, params) => request('GET', path + qs(params)),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};

/** Loads every page of a paginated list endpoint (up to `maxPages` x 100 rows). */
export async function fetchAll(path, params = {}, maxPages = 20) {
  const items = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await api.get(path, { ...params, page, limit: 100 });
    items.push(...res.items);
    if (page >= res.totalPages) break;
  }
  return items;
}

/** Turns an API error into one readable sentence for a toast. */
export function errorMessage(err) {
  if (!(err instanceof ApiError) || !Array.isArray(err.details) || !err.details.length) {
    return err?.message || 'Something went wrong';
  }
  const parts = err.details.slice(0, 3).map((d) => {
    if (d.productName !== undefined) {
      return `${d.productName} (need ${d.required}, available ${d.available})`;
    }
    return d.field ? `${d.field}: ${d.message}` : d.message;
  });
  return `${err.message} — ${parts.join('; ')}`;
}
