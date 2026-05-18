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

export default admin
