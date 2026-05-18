import { Hono } from 'hono'
import type { Env, FamilyRow } from './types'
import { formatFamily } from './types'
import { getFamilyWithStock } from './db'

const families = new Hono<{ Bindings: Env }>()

families.get('/', async (c) => {
  const { search, material, visual_color, low_stock_only, include_inactive } = c.req.query()

  const conditions: string[] = [include_inactive === 'true' ? '1=1' : 'f.active = 1']
  const params: unknown[] = []

  if (search) {
    conditions.push('(f.brand LIKE ? OR f.material LIKE ? OR f.brand_color_name LIKE ?)')
    const like = `%${search}%`
    params.push(like, like, like)
  }
  if (material) { conditions.push('f.material = ?'); params.push(material) }
  if (visual_color) { conditions.push('f.normalized_visual_color = ?'); params.push(visual_color) }
  if (low_stock_only === 'true') {
    conditions.push('COALESCE(p.current_quantity, 0) <= f.reorder_threshold')
  }

  const rows = await c.env.DB.prepare(`
    SELECT f.*, COALESCE(p.current_quantity, 0) as current_quantity,
      CASE WHEN COALESCE(p.current_quantity, 0) <= f.reorder_threshold THEN 1 ELSE 0 END as is_low_stock
    FROM filament_families f
    LEFT JOIN inventory_projection p ON p.filament_family_id = f.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      CASE WHEN COALESCE(p.current_quantity, 0) <= f.reorder_threshold THEN 0 ELSE 1 END ASC,
      (COALESCE(p.current_quantity, 0) - f.reorder_threshold) ASC,
      f.brand ASC, f.material ASC, f.brand_color_name ASC
  `).bind(...params).all<FamilyRow>()

  return c.json({ families: rows.results.map(formatFamily) })
})

families.get('/:id', async (c) => {
  const id = c.req.param('id')
  const family = await getFamilyWithStock(c.env.DB, id)
  if (!family) return c.json({ error: 'FAMILY_NOT_FOUND', message: 'Filament family not found' }, 404)
  return c.json(formatFamily(family))
})

families.get('/:id/alternatives', async (c) => {
  const id = c.req.param('id')
  const source = await c.env.DB.prepare(
    'SELECT material, normalized_visual_color FROM filament_families WHERE id = ?'
  ).bind(id).first<{ material: string; normalized_visual_color: string }>()

  if (!source) return c.json({ error: 'FAMILY_NOT_FOUND', message: 'Filament family not found' }, 404)

  const rows = await c.env.DB.prepare(`
    SELECT f.*, COALESCE(p.current_quantity, 0) as current_quantity,
      CASE WHEN COALESCE(p.current_quantity, 0) <= f.reorder_threshold THEN 1 ELSE 0 END as is_low_stock
    FROM filament_families f
    JOIN inventory_projection p ON p.filament_family_id = f.id
    WHERE f.material = ?
      AND f.normalized_visual_color = ?
      AND f.id != ?
      AND f.active = 1
      AND p.current_quantity > 0
    ORDER BY p.current_quantity DESC
  `).bind(source.material, source.normalized_visual_color, id).all<FamilyRow>()

  return c.json({ alternatives: rows.results.map(formatFamily) })
})

families.post('/', async (c) => {
  const body = await c.req.json()
  const { brand, material, brand_color_name, normalized_visual_color, reorder_threshold, photo_url = null, notes = null } = body

  if (!brand || !material || !brand_color_name || !normalized_visual_color || reorder_threshold === undefined) {
    return c.json({ error: 'INVALID_QUANTITY', message: 'Missing required fields' }, 400)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`
        INSERT INTO filament_families
          (id, brand, material, brand_color_name, normalized_visual_color, reorder_threshold, photo_url, notes, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(id, brand, material, brand_color_name, normalized_visual_color, reorder_threshold, photo_url, notes, now, now),
      c.env.DB.prepare(
        'INSERT INTO inventory_projection (filament_family_id, current_quantity, updated_at) VALUES (?, 0, ?)'
      ).bind(id, now),
    ])
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'DUPLICATE_FAMILY', message: 'A family with this brand, material, and color already exists' }, 409)
    }
    throw e
  }

  const family = await getFamilyWithStock(c.env.DB, id)
  return c.json(formatFamily(family!), 201)
})

families.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const existing = await c.env.DB.prepare('SELECT id FROM filament_families WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: 'FAMILY_NOT_FOUND', message: 'Filament family not found' }, 404)

  const updates: string[] = []
  const params: unknown[] = []

  if (body.brand !== undefined) { updates.push('brand = ?'); params.push(body.brand) }
  if (body.material !== undefined) { updates.push('material = ?'); params.push(body.material) }
  if (body.brand_color_name !== undefined) { updates.push('brand_color_name = ?'); params.push(body.brand_color_name) }
  if (body.normalized_visual_color !== undefined) { updates.push('normalized_visual_color = ?'); params.push(body.normalized_visual_color) }
  if (body.reorder_threshold !== undefined) { updates.push('reorder_threshold = ?'); params.push(body.reorder_threshold) }
  if (body.active !== undefined) { updates.push('active = ?'); params.push(body.active ? 1 : 0) }
  if (body.notes !== undefined) { updates.push('notes = ?'); params.push(body.notes) }
  if (body.photo_url !== undefined) { updates.push('photo_url = ?'); params.push(body.photo_url) }

  if (updates.length === 0) return c.json({ error: 'INVALID_QUANTITY', message: 'No valid fields to update' }, 400)

  const now = new Date().toISOString()
  updates.push('updated_at = ?')
  params.push(now, id)

  try {
    await c.env.DB.prepare(`UPDATE filament_families SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run()
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'DUPLICATE_FAMILY', message: 'A family with this brand, material, and color already exists' }, 409)
    }
    throw e
  }

  const family = await getFamilyWithStock(c.env.DB, id)
  return c.json(formatFamily(family!))
})

families.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const existing = await c.env.DB.prepare('SELECT id FROM filament_families WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: 'FAMILY_NOT_FOUND', message: 'Filament family not found' }, 404)

  const movementCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM inventory_movements WHERE filament_family_id = ?'
  ).bind(id).first<{ count: number }>()

  if ((movementCount?.count ?? 0) > 0) {
    return c.json({
      error: 'FAMILY_HAS_MOVEMENTS',
      message: `No se puede borrar: el filamento tiene ${movementCount!.count} movimiento(s). Desactivalo en su lugar.`,
    }, 409)
  }

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM barcode_mappings WHERE filament_family_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM inventory_projection WHERE filament_family_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM filament_families WHERE id = ?').bind(id),
  ])

  return c.json({ deleted: id })
})

export default families
