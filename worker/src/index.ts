import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'

export interface Env {
  DB: D1Database
  CACHE: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())
app.use('/api/*', authMiddleware)

app.get('/health', (c) => c.json({ status: 'ok' }))

app.get('/api/inventory', (c) =>
  c.json({ message: 'PignusInventario API — Phase 0' })
)

export default app
