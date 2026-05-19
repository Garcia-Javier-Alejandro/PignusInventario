import { Hono } from 'hono'
import type { Env } from './types'

const history = new Hono<{ Bindings: Env }>()

const DEFAULT_DAYS = 30
const MAX_DAYS = 365

function parseDays(raw: string | undefined): number {
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_DAYS
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DAYS
  return Math.min(n, MAX_DAYS)
}

// Cumulative SUM(quantity_delta) up to and including each day in the window.
// Movements are stored as ISO strings; DATE() extracts the UTC day, which is
// good enough for an aggregate chart even with Buenos Aires (UTC-3) clocks.
const TOTAL_STOCK_SQL = `
  WITH RECURSIVE days(d) AS (
    SELECT DATE('now', '-' || ? || ' days')
    UNION ALL
    SELECT DATE(d, '+1 day') FROM days WHERE d < DATE('now')
  )
  SELECT
    d AS date,
    (
      SELECT COALESCE(SUM(quantity_delta), 0)
      FROM inventory_movements
      WHERE DATE(created_at) <= d
    ) AS total_stock
  FROM days
  ORDER BY d
`

const FAMILY_STOCK_SQL = `
  WITH RECURSIVE days(d) AS (
    SELECT DATE('now', '-' || ? || ' days')
    UNION ALL
    SELECT DATE(d, '+1 day') FROM days WHERE d < DATE('now')
  )
  SELECT
    d AS date,
    (
      SELECT COALESCE(SUM(quantity_delta), 0)
      FROM inventory_movements
      WHERE filament_family_id = ?
        AND DATE(created_at) <= d
    ) AS stock
  FROM days
  ORDER BY d
`

history.get('/total-stock', async (c) => {
  const days = parseDays(c.req.query('days'))
  const result = await c.env.DB.prepare(TOTAL_STOCK_SQL).bind(days - 1).all<{
    date: string
    total_stock: number
  }>()
  return c.json({ days, series: result.results })
})

history.get('/family/:id', async (c) => {
  const id = c.req.param('id')
  const days = parseDays(c.req.query('days'))
  const result = await c.env.DB.prepare(FAMILY_STOCK_SQL).bind(days - 1, id).all<{
    date: string
    stock: number
  }>()
  return c.json({ family_id: id, days, series: result.results })
})

export default history
