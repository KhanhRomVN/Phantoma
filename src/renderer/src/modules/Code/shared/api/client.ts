import { resolveCodeBaseUrl } from './code-base-url';

// ASSUMED: token chưa được main cấp (docs mục 5) → chưa gửi header Authorization
export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${await resolveCodeBaseUrl()}/api/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error ?? `Code server error (HTTP ${res.status})`);
  }
  return payload.data as T;
}