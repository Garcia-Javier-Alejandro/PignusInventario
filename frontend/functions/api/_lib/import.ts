import { Hono } from 'hono'
import type { Env } from './types'
import { getUserEmail } from './auth'

const VALID_COLORS = new Set([
  'BLACK', 'WHITE', 'GRAY', 'BEIGE', 'BROWN',
  'RED', 'ORANGE', 'YELLOW', 'GREEN', 'TEAL',
  'BLUE', 'PURPLE', 'PINK', 'TRANSLUCENT', 'MULTICOLOR',
])

// Spelling aliases the importer accepts but normalizes to a canonical value.
const COLOR_ALIASES: Record<string, string> = {
  GREY: 'GRAY',
}

function normalizeColor(input: string): string {
  const upper = input.trim().toUpperCase()
  return COLOR_ALIASES[upper] ?? upper
}

interface ImportRow {
  brand: string
  material: string
  brand_color_name: string
  normalized_visual_color: string
  initial_quantity: number
  active: boolean
  reorder_threshold?: number
}

interface RowResult {
  index: number
  ok: boolean
  family_id?: string
  status?: 'created' | 'duplicate'
  error?: string
}

const importer = new Hono<{ Bindings: Env }>()

importer.post('/', async (c) => {
  const body = await c.req.json<{ rows: ImportRow[] }>()
  const rows = Array.isArray(body?.rows) ? body.rows : []
  if (rows.length === 0) {
    return c.json({ error: 'INVALID_QUANTITY', message: 'No rows to import' }, 400)
  }

  const user = getUserEmail(c)
  const results: RowResult[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const result: RowResult = { index: i, ok: false }

    const brand = String(r.brand ?? '').trim()
    const material = String(r.material ?? '').trim()
    const colorName = String(r.brand_color_name ?? '').trim()
    const visualColor = normalizeColor(String(r.normalized_visual_color ?? ''))
    const qty = Number.isInteger(r.initial_quantity) ? r.initial_quantity : parseInt(String(r.initial_quantity ?? '0'), 10)
    const active = r.active === false ? 0 : 1
    const threshold = Number.isInteger(r.reorder_threshold) ? r.reorder_threshold! : 3

    if (!brand || !material || !colorName) {
      result.error = 'Marca, material y color son obligatorios'
      results.push(result); continue
    }
    if (!VALID_COLORS.has(visualColor)) {
      result.error = `Color visual inválido: "${visualColor}"`
      results.push(result); continue
    }
    if (!Number.isFinite(qty) || qty < 0) {
      result.error = `Cantidad inválida: ${r.initial_quantity}`
      results.push(result); continue
    }

    const existing = await c.env.DB.prepare(
      'SELECT id FROM filament_families WHERE brand = ? AND material = ? AND brand_color_name = ?'
    ).bind(brand, material, colorName).first<{ id: string }>()

    if (existing) {
      result.ok = true
      result.family_id = existing.id
      result.status = 'duplicate'
      results.push(result)
      continue
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    try {
      const batch = [
        c.env.DB.prepare(`
          INSERT INTO filament_families
            (id, brand, material, brand_color_name, normalized_visual_color, reorder_threshold, photo_url, notes, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
        `).bind(id, brand, material, colorName, visualColor, threshold, active, now, now),
        c.env.DB.prepare(
          'INSERT INTO inventory_projection (filament_family_id, current_quantity, updated_at) VALUES (?, 0, ?)'
        ).bind(id, now),
      ]
      if (qty > 0) {
        const moveId = crypto.randomUUID()
        batch.push(
          c.env.DB.prepare(`
            INSERT INTO inventory_movements
              (id, filament_family_id, movement_type, quantity_delta, notes, created_by, created_at)
            VALUES (?, ?, 'RECEIVE_STOCK', ?, 'Importación inicial', ?, ?)
          `).bind(moveId, id, qty, user, now),
          c.env.DB.prepare(
            'UPDATE inventory_projection SET current_quantity = ?, updated_at = ? WHERE filament_family_id = ?'
          ).bind(qty, now, id),
        )
      }
      await c.env.DB.batch(batch)
      result.ok = true
      result.family_id = id
      result.status = 'created'
    } catch (e: unknown) {
      result.error = e instanceof Error ? e.message : 'Error desconocido'
    }
    results.push(result)
  }

  const created = results.filter((r) => r.status === 'created').length
  const duplicates = results.filter((r) => r.status === 'duplicate').length
  const errors = results.filter((r) => !r.ok).length

  return c.json({ created, duplicates, errors, results })
})

export default importer
