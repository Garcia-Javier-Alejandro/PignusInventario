import type { ApiError, ApiErrorCode } from '../types'

export class ApiResponseError extends Error {
  constructor(public readonly code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiResponseError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    let parsed: ApiError | null = null
    try { parsed = JSON.parse(text) } catch { /* not JSON */ }
    if (parsed?.error) throw new ApiResponseError(parsed.error, parsed.message)
    throw new ApiResponseError('UNKNOWN' as ApiErrorCode, `HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}
