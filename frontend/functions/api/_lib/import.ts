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
  status?: 'created' | 'updated'
  error?: string
}

function toNonNegInt(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.floor(n)
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
    const qty = toNonNegInt(r.initial_quantity, -1)
    const active = r.active === false ? 0 : 1
    const threshold = toNonNegInt(r.reorder_threshold, 3)

    if (!brand || !material || !colorName) {
      result.error = 'Marca, material y color son obligatorios'
      results.push(result); continue
    }
    if (!VALID_COLORS.has(visualColor)) {
      result.error = `Color visual inválido: "${visualColor}"`
      results.push(result); continue
    }
    if (qty < 0) {
      result.error = `Cantidad inválida: ${r.initial_quantity}`
      results.push(result); continue
    }

    const existing = await c.env.DB.prepare(
      'SELECT id FROM filament_families WHERE brand = ? AND material = ? AND brand_color_name = ?'
    ).bind(brand, material, colorName).first<{ id: string }>()

    const now = new Date().toISOString()

    if (existing) {
      // Update editable fields (threshold + active) so a re-import fixes them.
      // Do NOT touch stock, color name, or visual color in the common case.
      await c.env.DB.prepare(
        'UPDATE filament_families SET reorder_threshold = ?, active = ?, updated_at = ? WHERE id = ?'
      ).bind(threshold, active, now, existing.id).run()

      // Re-stock branch: if the family currently has zero stock (e.g. after a
      // 'Borrar movimientos' reset) and the CSV row brings stock, insert an
      // 'Importación inicial' baseline movement and lift the projection. This
      // lets a re-import recover the catalog from a wiped state without
      // double-counting when stock is already non-zero.
      if (qty > 0) {
        const proj = await c.env.DB.prepare(
          'SELECT current_quantity FROM inventory_projection WHERE filament_family_id = ?'
        ).bind(existing.id).first<{ current_quantity: number }>()

        if (!proj || proj.current_quantity === 0) {
          const moveId = crypto.randomUUID()
          await c.env.DB.batch([
            c.env.DB.prepare(`
              INSERT INTO inventory_movements
                (id, filament_family_id, movement_type, quantity_delta, notes, created_by, created_at)
              VALUES (?, ?, 'RECEIVE_STOCK', ?, 'Importación inicial', ?, ?)
            `).bind(moveId, existing.id, qty, user, now),
            c.env.DB.prepare(
              'UPDATE inventory_projection SET current_quantity = ?, updated_at = ? WHERE filament_family_id = ?'
            ).bind(qty, now, existing.id),
          ])
        }
      }

      result.ok = true
      result.family_id = existing.id
      result.status = 'updated'
      results.push(result)
      continue
    }

    const id = crypto.randomUUID()

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
  const updated = results.filter((r) => r.status === 'updated').length
  const errors = results.filter((r) => !r.ok).length

  return c.json({ created, updated, errors, results })
})

export default importer
