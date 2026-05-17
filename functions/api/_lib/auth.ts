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
  return c.req.header('Cf-Access-Authenticated-User-Email') ?? 'unknown'
}
