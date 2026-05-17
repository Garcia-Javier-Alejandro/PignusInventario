import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

interface Env {
  DB: D1Database
  CACHE: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', async (c, next) => {
  const jwt = c.req.header('CF-Access-Jwt-Assertion')
  if (!jwt) {
    return c.json({ error: 'AUTH_REQUIRED', message: 'Authentication required' }, 401)
  }
  await next()
})

app.get('/api/inventory', (c) =>
  c.json({ message: 'PignusInventario API — Phase 0' })
)

export const onRequest = handle(app)
