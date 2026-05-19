import { Hono } from 'hono'
import type { Env } from './types'
import { getUserEmail } from './auth'
import { invalidateInventoryCache } from './cache'

const admin = new Hono<{ Bindings: Env }>()

admin.get('/counts', async (c) => {
  const [families, movements, barcodes, projections] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT COUNT(*) as n FROM filament_families'),
    c.env.DB.prepare('SELECT COUNT(*) as n FROM inventory_movements'),
    c.env.DB.prepare('SELECT COUNT(*) as n FROM barcode_mappings'),
    c.env.DB.prepare('SELECT COUNT(*) as n FROM inventory_projection'),
  ])
  return c.json({
    families: (families.results[0] as { n: number }).n,
    movements: (movements.results[0] as { n: number }).n,
    barcodes: (barcodes.results[0] as { n: number }).n,
    projections: (projections.results[0] as { n: number }).n,
  })
})

admin.post('/wipe', async (c) => {
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM inventory_movements'),
    c.env.DB.prepare('DELETE FROM barcode_mappings'),
    c.env.DB.prepare('DELETE FROM inventory_projection'),
    c.env.DB.prepare('DELETE FROM filament_families'),
  ])
  await invalidateInventoryCache(c.env)
  return c.json({ wiped: true })
})

// Narrower reset: clear movement history but preserve the current stock.
// For each family with stock > 0 we insert a single 'Importación inicial'
// baseline movement equal to the prior stock — the dashboard's monthly
// Ingresos KPI already filters that notes value out, so the baseline
// doesn't pollute the KPI while keeping the projection self-consistent.
admin.post('/wipe-movements', async (c) => {
  const user = getUserEmail(c)
  const now = new Date().toISOString()

  const stocks = await c.env.DB.prepare(
    'SELECT filament_family_id, current_quantity FROM inventory_projection WHERE current_quantity > 0',
  ).all<{ filament_family_id: string; current_quantity: number }>()

  await c.env.DB.prepare('DELETE FROM inventory_movements').run()

  if (stocks.results.length > 0) {
    const baselines = stocks.results.map((s) =>
      c.env.DB.prepare(`
        INSERT INTO inventory_movements
          (id, filament_family_id, movement_type, quantity_delta, notes, created_by, created_at)
        VALUES (?, ?, 'RECEIVE_STOCK', ?, 'Importación inicial', ?, ?)
      `).bind(crypto.randomUUID(), s.filament_family_id, s.current_quantity, user, now),
    )
    await c.env.DB.batch(baselines)
  }

  await invalidateInventoryCache(c.env)

  return c.json({ wiped: true, preserved_families: stocks.results.length })
})

// Force-clear the inventory KV cache. Used when a debug user wants the
// next dashboard fetch to come from D1 without waiting for the TTL.
admin.post('/cache-clear', async (c) => {
  await invalidateInventoryCache(c.env)
  return c.json({ cleared: true })
})

export default admin
