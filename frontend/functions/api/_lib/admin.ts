import { Hono } from 'hono'
import type { Env } from './types'

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
  return c.json({ wiped: true })
})

// Narrower reset: clear movement history and zero the projection, but keep
// the filament catalog and the barcode mappings. Used to reset KPIs after
// test interactions polluted them, without forcing a re-import.
admin.post('/wipe-movements', async (c) => {
  const now = new Date().toISOString()
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM inventory_movements'),
    c.env.DB.prepare('UPDATE inventory_projection SET current_quantity = 0, updated_at = ?').bind(now),
  ])
  return c.json({ wiped: true })
})

export default admin
