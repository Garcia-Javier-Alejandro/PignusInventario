import { Hono } from 'hono'
import type { Env, FamilyRow, MovementRow } from './types'
import { formatFamily, formatMovement } from './types'

const dashboard = new Hono<{ Bindings: Env }>()

dashboard.get('/', async (c) => {
  const [lowStockResult, recentMovementsResult, totalResult] = await c.env.DB.batch([
    c.env.DB.prepare(`
      SELECT f.*, COALESCE(p.current_quantity, 0) as current_quantity, 1 as is_low_stock
      FROM filament_families f
      LEFT JOIN inventory_projection p ON p.filament_family_id = f.id
      WHERE f.active = 1 AND COALESCE(p.current_quantity, 0) <= f.reorder_threshold
      ORDER BY COALESCE(p.current_quantity, 0) ASC, f.brand ASC
    `),
    c.env.DB.prepare(`
      SELECT m.*, f.brand, f.material, f.brand_color_name
      FROM inventory_movements m
      JOIN filament_families f ON f.id = m.filament_family_id
      ORDER BY m.created_at DESC LIMIT 10
    `),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM filament_families WHERE active = 1'),
  ])

  const recentlyConsumed = await c.env.DB.prepare(`
    SELECT f.*, COALESCE(p.current_quantity, 0) as current_quantity,
      CASE WHEN COALESCE(p.current_quantity, 0) <= f.reorder_threshold THEN 1 ELSE 0 END as is_low_stock
    FROM filament_families f
    LEFT JOIN inventory_projection p ON p.filament_family_id = f.id
    WHERE f.id IN (
      SELECT DISTINCT filament_family_id FROM inventory_movements
      WHERE movement_type = 'CONSUME_OPEN' ORDER BY created_at DESC LIMIT 5
    )
  `).all<FamilyRow>()

  const recentlyReceived = await c.env.DB.prepare(`
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

  return c.json({
    low_stock: lowStock,
    recent_movements: (recentMovementsResult.results as MovementRow[]).map(formatMovement),
    recently_consumed: recentlyConsumed.results.map(formatFamily),
    recently_received: recentlyReceived.results.map(formatFamily),
    total_families: (totalResult.results[0] as { count: number }).count,
    low_stock_count: lowStock.length,
  })
})

export default dashboard
