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
    const err: ApiError = await res.json()
    throw new ApiResponseError(err.error, err.message)
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
