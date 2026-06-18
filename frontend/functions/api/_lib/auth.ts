import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import type { Env } from './types'

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const jwt = c.req.header('CF-Access-Jwt-Assertion')
  if (!jwt) {
    return c.json({ error: 'AUTH_REQUIRED', message: 'Authentication required' }, 401)
  }
  await next()
})

export function getUserEmail(c: Context): string {
  const header = c.req.header('Cf-Access-Authenticated-User-Email')
  if (header) return header
  const jwt = c.req.header('CF-Access-Jwt-Assertion')
  if (!jwt) return 'unknown'
  try {
    let b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    b64 += '='.repeat((4 - b64.length % 4) % 4)
    return (JSON.parse(atob(b64)) as { email?: string }).email ?? 'unknown'
  } catch {
    return 'unknown'
  }
}
