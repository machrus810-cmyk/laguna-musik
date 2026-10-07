import { getClientUserId } from '@/components/ClientUserInit';

/**
 * Standard fetch wrapper that ensures the x-user-id header, credentials,
 * and JSON accept headers are included for multi-user isolation.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let userId = '';
  if (typeof window !== 'undefined') {
    try {
      userId = getClientUserId();
    } catch {}
  }

  const headers = new Headers(init?.headers);
  if (userId && !headers.has('x-user-id')) {
    headers.set('x-user-id', userId);
  }
  if (!headers.has('Accept') && !headers.has('accept')) {
    headers.set('Accept', 'application/json, text/plain, */*');
  }

  return fetch(input, {
    credentials: 'same-origin',
    ...init,
    headers,
  });
}

/**
 * Safe JSON parser for responses that may return HTML error pages or malformed text,
 * preventing 'Unexpected token <, "<!doctype " is not valid JSON' exceptions.
 */
export async function safeJson<T = Record<string, unknown>>(
  res: Response,
  fallback: T = { success: false, message: 'Terjadi kendala pada server.' } as unknown as T
): Promise<T> {
  try {
    const text = await res.text();
    if (!text || text.trim() === '') {
      return fallback;
    }

    const trimmed = text.trim();
    // If response is an HTML document or error page
    if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
      return {
        success: false,
        message: `Server mengembalikan halaman HTML (Status ${res.status || 500}).`,
        status: res.status,
      } as unknown as T;
    }

    // Try parsing JSON
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      return {
        success: false,
        message: trimmed.length > 200 ? `${trimmed.slice(0, 200)}...` : trimmed,
        status: res.status,
      } as unknown as T;
    }
  } catch {
    return fallback;
  }
}

/**
 * Convenience helper: apiFetch and safeJson in one call
 */
export async function apiFetchJson<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback?: T
): Promise<{ res: Response; data: T }> {
  try {
    const res = await apiFetch(input, init);
    const data = await safeJson<T>(res, fallback);
    return { res, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Koneksi terputus';
    const errorData = {
      success: false,
      message: `Gagal terhubung: ${msg}`,
    } as unknown as T;
    return {
      res: new Response(JSON.stringify(errorData), { status: 500 }),
      data: errorData,
    };
  }
}
