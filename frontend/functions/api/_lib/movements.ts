import { Hono } from 'hono'
import type { Env, MovementRow } from './types'
import { formatMovement } from './types'
import { recomputeProjection, getCurrentStock } from './db'
import { getUserEmail } from './auth'

const movements = new Hono<{ Bindings: Env }>()

movements.post('/receive', async (c) => {
  const { barcode: barcodeVal, quantity, notes = null } = await c.req.json()

  if (!Number.isInteger(quantity) || quantity < 1) {
    return c.json({ error: 'INVALID_QUANTITY', message: 'Quantity must be a positive integer' }, 400)
  }

  const mapping = await c.env.DB.prepare(
    'SELECT filament_family_id FROM barcode_mappings WHERE barcode = ?'
  ).bind(barcodeVal).first<{ filament_family_id: string }>()
  if (!mapping) return c.json({ error: 'BARCODE_NOT_FOUND', message: 'Barcode not found' }, 404)

  const family = await c.env.DB.prepare(
    'SELECT id, active FROM filament_families WHERE id = ?'
  ).bind(mapping.filament_family_id).first<{ id: string; active: number }>()
  if (!family || family.active === 0) {
    return c.json({ error: 'FAMILY_INACTIVE', message: 'Filament family is inactive' }, 409)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await c.env.DB.prepare(`
    INSERT INTO inventory_movements (id, filament_family_id, movement_type, quantity_delta, notes, created_by, created_at)
    VALUES (?, ?, 'RECEIVE_STOCK', ?, ?, ?, ?)
  `).bind(id, family.id, quantity, notes, getUserEmail(c), now).run()

  await recomputeProjection(c.env.DB, family.id, now)

  const movement = await c.env.DB.prepare(
    'SELECT * FROM inventory_movements WHERE id = ?'
  ).bind(id).first<MovementRow>()
  const updated_quantity = await getCurrentStock(c.env.DB, family.id)

  return c.json({ movement: formatMovement(movement!), updated_quantity })
})

movements.post('/consume', async (c) => {
  const { barcode: barcodeVal, quantity = 1, notes = null } = await c.req.json()

  if (!Number.isInteger(quantity) || quantity < 1) {
    return c.json({ error: 'INVALID_QUANTITY', message: 'Quantity must be a positive integer' }, 400)
  }

  const mapping = await c.env.DB.prepare(
    'SELECT filament_family_id FROM barcode_mappings WHERE barcode = ?'
  ).bind(barcodeVal).first<{ filament_family_id: string }>()
  if (!mapping) return c.json({ error: 'BARCODE_NOT_FOUND', message: 'Barcode not found' }, 404)

  const family = await c.env.DB.prepare(
    'SELECT id, active FROM filament_families WHERE id = ?'
  ).bind(mapping.filament_family_id).first<{ id: string; active: number }>()
  if (!family || family.active === 0) {
    return c.json({ error: 'FAMILY_INACTIVE', message: 'Filament family is inactive' }, 409)
  }

  const currentStock = await getCurrentStock(c.env.DB, family.id)
  if (currentStock < quantity) {
    return c.json({ error: 'INSUFFICIENT_STOCK', message: `Only ${currentStock} spools available` }, 409)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await c.env.DB.prepare(`
    INSERT INTO inventory_movements (id, filament_family_id, movement_type, quantity_delta, notes, created_by, created_at)
    VALUES (?, ?, 'CONSUME_OPEN', ?, ?, ?, ?)
  `).bind(id, family.id, -quantity, notes, getUserEmail(c), now).run()

  await recomputeProjection(c.env.DB, family.id, now)

  const movement = await c.env.DB.prepare(
    'SELECT * FROM inventory_movements WHERE id = ?'
  ).bind(id).first<MovementRow>()
  const updated_quantity = await getCurrentStock(c.env.DB, family.id)

  return c.json({ movement: formatMovement(movement!), updated_quantity })
})

movements.post('/adjust', async (c) => {
  const { filament_family_id, quantity_delta, notes } = await c.req.json()

  if (!notes) return c.json({ error: 'INVALID_QUANTITY', message: 'Notes are required for adjustments' }, 400)
  if (!Number.isInteger(quantity_delta) || quantity_delta === 0) {
    return c.json({ error: 'INVALID_QUANTITY', message: 'quantity_delta must be a non-zero integer' }, 400)
  }

  const family = await c.env.DB.prepare(
    'SELECT id FROM filament_families WHERE id = ?'
  ).bind(filament_family_id).first<{ id: string }>()
  if (!family) return c.json({ error: 'FAMILY_NOT_FOUND', message: 'Filament family not found' }, 404)

  if (quantity_delta < 0) {
    const currentStock = await getCurrentStock(c.env.DB, filament_family_id)
    if (currentStock + quantity_delta < 0) {
      return c.json({ error: 'INSUFFICIENT_STOCK', message: 'Adjustment would result in negative stock' }, 409)
    }
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await c.env.DB.prepare(`
    INSERT INTO inventory_movements (id, filament_family_id, movement_type, quantity_delta, notes, created_by, created_at)
    VALUES (?, ?, 'MANUAL_ADJUSTMENT', ?, ?, ?, ?)
  `).bind(id, filament_family_id, quantity_delta, notes, getUserEmail(c), now).run()

  await recomputeProjection(c.env.DB, filament_family_id, now)

  const movement = await c.env.DB.prepare(
    'SELECT * FROM inventory_movements WHERE id = ?'
  ).bind(id).first<MovementRow>()
  const updated_quantity = await getCurrentStock(c.env.DB, filament_family_id)

  return c.json({ movement: formatMovement(movement!), updated_quantity })
})

movements.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const movement = await c.env.DB.prepare(
    'SELECT * FROM inventory_movements WHERE id = ?'
  ).bind(id).first<MovementRow>()
  if (!movement) return c.json({ error: 'MOVEMENT_NOT_FOUND', message: 'Movement not found' }, 404)

  const updates: string[] = []
  const params: unknown[] = []

  if (body.quantity_delta !== undefined) {
    if (!Number.isInteger(body.quantity_delta) || body.quantity_delta === 0) {
      return c.json({ error: 'INVALID_QUANTITY', message: 'quantity_delta must be a non-zero integer' }, 400)
    }
    updates.push('quantity_delta = ?')
    params.push(body.quantity_delta)
  }
  if (body.notes !== undefined) { updates.push('notes = ?'); params.push(body.notes) }

  const now = new Date().toISOString()
  updates.push('updated_by = ?', 'updated_at = ?')
  params.push(getUserEmail(c), now, id)

  await c.env.DB.prepare(
    `UPDATE inventory_movements SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run()

  await recomputeProjection(c.env.DB, movement.filament_family_id, now)

  const updated = await c.env.DB.prepare(
    'SELECT * FROM inventory_movements WHERE id = ?'
  ).bind(id).first<MovementRow>()
  return c.json(formatMovement(updated!))
})

movements.get('/', async (c) => {
  const { filament_family_id, movement_type, limit = '50', offset = '0' } = c.req.query()

  const conditions: string[] = ['1=1']
  const params: unknown[] = []

  if (filament_family_id) { conditions.push('m.filament_family_id = ?'); params.push(filament_family_id) }
  if (movement_type) { conditions.push('m.movement_type = ?'); params.push(movement_type) }

  const where = conditions.join(' AND ')

  const [rows, totalRow] = await c.env.DB.batch([
    c.env.DB.prepare(`
      SELECT m.*, f.brand, f.material, f.brand_color_name, f.normalized_visual_color
      FROM inventory_movements m
      JOIN filament_families f ON f.id = m.filament_family_id
      WHERE ${where}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, parseInt(limit), parseInt(offset)),
    c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM inventory_movements m WHERE ${where}`
    ).bind(...params),
  ])

  return c.json({
    movements: (rows.results as MovementRow[]).map(formatMovement),
    total: (totalRow.results[0] as { count: number }).count,
  })
})

export default movements
