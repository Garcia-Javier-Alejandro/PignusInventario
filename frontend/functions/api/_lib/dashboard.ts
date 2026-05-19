import { Hono } from 'hono'
import type { Env, FamilyRow, MovementRow } from './types'
import { formatFamily, formatMovement } from './types'
import { getCachedJson, CACHE_KEYS, CACHE_TTL } from './cache'

const dashboard = new Hono<{ Bindings: Env }>()

dashboard.get('/', async (c) => {
  // Cached for CACHE_TTL.dashboard seconds. Invalidated on every write that
  // affects stock, low-stock state, or active filament counts.
  const body = await getCachedJson(c, CACHE_KEYS.dashboard, CACHE_TTL.dashboard, () => computeDashboard(c.env))
  return c.json(body)
})

async function computeDashboard(env: Env) {
  // First day of the current month (UTC) as an ISO string for the
  // monthly movement queries.
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  const [
    lowStockResult,
    recentMovementsResult,
    totalResult,
    totalStockResult,
    consumedMonthResult,
    receivedMonthResult,
  ] = await env.DB.batch([
    env.DB.prepare(`
      SELECT f.*, COALESCE(p.current_quantity, 0) as current_quantity, 1 as is_low_stock
      FROM filament_families f
      LEFT JOIN inventory_projection p ON p.filament_family_id = f.id
      WHERE f.active = 1 AND COALESCE(p.current_quantity, 0) <= f.reorder_threshold
      ORDER BY COALESCE(p.current_quantity, 0) ASC, f.brand ASC
    `),
    env.DB.prepare(`
      SELECT m.*, f.brand, f.material, f.brand_color_name, f.normalized_visual_color
      FROM inventory_movements m
      JOIN filament_families f ON f.id = m.filament_family_id
      ORDER BY m.created_at DESC LIMIT 10
    `),
    env.DB.prepare('SELECT COUNT(*) as count FROM filament_families WHERE active = 1'),
    env.DB.prepare(`
      SELECT COALESCE(SUM(p.current_quantity), 0) as total
      FROM inventory_projection p
      JOIN filament_families f ON f.id = p.filament_family_id
      WHERE f.active = 1
    `),
    env.DB.prepare(`
      SELECT COALESCE(SUM(-quantity_delta), 0) as total
      FROM inventory_movements
      WHERE movement_type = 'CONSUME_OPEN' AND created_at >= ?
    `).bind(startOfMonth),
    env.DB.prepare(`
      SELECT COALESCE(SUM(quantity_delta), 0) as total
      FROM inventory_movements
      WHERE movement_type = 'RECEIVE_STOCK'
        AND created_at >= ?
        AND (notes IS NULL OR notes != 'Importación inicial')
    `).bind(startOfMonth),
  ])

  const recentlyConsumed = await env.DB.prepare(`
    SELECT f.*, COALESCE(p.current_quantity, 0) as current_quantity,
      CASE WHEN COALESCE(p.current_quantity, 0) <= f.reorder_threshold THEN 1 ELSE 0 END as is_low_stock
    FROM filament_families f
    LEFT JOIN inventory_projection p ON p.filament_family_id = f.id
    WHERE f.id IN (
      SELECT DISTINCT filament_family_id FROM inventory_movements
      WHERE movement_type = 'CONSUME_OPEN' ORDER BY created_at DESC LIMIT 5
    )
  `).all<FamilyRow>()

  const recentlyReceived = await env.DB.prepare(`
    SELECT f.*, COALESCE(p.current_quantity, 0) as current_quantity,
      CASE WHEN COALESCE(p.current_quantity, 0) <= f.reorder_threshold THEN 1 ELSE 0 END as is_low_stock
    FROM filament_families f
    LEFT JOIN inventory_projection p ON p.filament_family_id = f.id
    WHERE f.id IN (
      SELECT DISTINCT filament_family_id FROM inventory_movements
      WHERE movement_type = 'RECEIVE_STOCK' ORDER BY created_at DESC LIMIT 5
    )
  `).all<FamilyRow>()

  const lowStock = (lowStockResult.results as FamilyRow[]).map(formatFamily)

  return {
    low_stock: lowStock,
    recent_movements: (recentMovementsResult.results as MovementRow[]).map(formatMovement),
    recently_consumed: recentlyConsumed.results.map(formatFamily),
    recently_received: recentlyReceived.results.map(formatFamily),
    total_families: (totalResult.results[0] as { count: number }).count,
    low_stock_count: lowStock.length,
    total_stock: (totalStockResult.results[0] as { total: number }).total,
    consumed_this_month: (consumedMonthResult.results[0] as { total: number }).total,
    received_this_month: (receivedMonthResult.results[0] as { total: number }).total,
  }
}

export default dashboard
