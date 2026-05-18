import { Hono } from 'hono'
import type { Env, FamilyRow } from './types'
import { formatFamily } from './types'

const barcode = new Hono<{ Bindings: Env }>()

barcode.get('/:barcode', async (c) => {
  const barcodeVal = c.req.param('barcode')

  const mapping = await c.env.DB.prepare(
    'SELECT filament_family_id FROM barcode_mappings WHERE barcode = ?'
  ).bind(barcodeVal).first<{ filament_family_id: string }>()

  if (!mapping) return c.json({ found: false })

  const family = await c.env.DB.prepare(`
    SELECT f.*, COALESCE(p.current_quantity, 0) as current_quantity,
      CASE WHEN COALESCE(p.current_quantity, 0) <= f.reorder_threshold THEN 1 ELSE 0 END as is_low_stock
    FROM filament_families f
    LEFT JOIN inventory_projection p ON p.filament_family_id = f.id
    WHERE f.id = ?
  `).bind(mapping.filament_family_id).first<FamilyRow>()

  if (!family) return c.json({ found: false })

  return c.json({ found: true, filament_family: formatFamily(family) })
})

barcode.post('/register', async (c) => {
  const { barcode: barcodeVal, filament_family_id } = await c.req.json()

  const family = await c.env.DB.prepare('SELECT id FROM filament_families WHERE id = ?').bind(filament_family_id).first()
  if (!family) return c.json({ error: 'FAMILY_NOT_FOUND', message: 'Filament family not found' }, 404)

  const now = new Date().toISOString()

  try {
    await c.env.DB.prepare(
      'INSERT INTO barcode_mappings (barcode, filament_family_id, created_at) VALUES (?, ?, ?)'
    ).bind(barcodeVal, filament_family_id, now).run()
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'BARCODE_CONFLICT', message: 'Barcode already mapped to a family' }, 409)
    }
    throw e
  }

  return c.json({ barcode: barcodeVal, filament_family_id, created_at: now }, 201)
})

export default barcode
