import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { authMiddleware } from './_lib/auth'
import type { Env } from './_lib/types'
import families from './_lib/families'
import barcode from './_lib/barcode'
import movements from './_lib/movements'
import dashboard from './_lib/dashboard'

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', authMiddleware)

app.route('/api/inventory/families', families)
app.route('/api/inventory/barcode', barcode)
app.route('/api/inventory/movements', movements)
app.route('/api/inventory/dashboard', dashboard)

export const onRequest = handle(app)
