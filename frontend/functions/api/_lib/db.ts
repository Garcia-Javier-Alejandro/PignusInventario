import type { FamilyRow } from './types'

export async function recomputeProjection(db: D1Database, familyId: string, now: string): Promise<void> {
  await db.prepare(`
    INSERT INTO inventory_projection (filament_family_id, current_quantity, updated_at)
    VALUES (?, (SELECT COALESCE(SUM(quantity_delta), 0) FROM inventory_movements WHERE filament_family_id = ?), ?)
    ON CONFLICT(filament_family_id) DO UPDATE SET
      current_quantity = excluded.current_quantity,
      updated_at = excluded.updated_at
  `).bind(familyId, familyId, now).run()
}

export async function getFamilyWithStock(db: D1Database, familyId: string): Promise<FamilyRow | null> {
  return db.prepare(`
    SELECT f.*, COALESCE(p.current_quantity, 0) as current_quantity,
      CASE WHEN COALESCE(p.current_quantity, 0) <= f.reorder_threshold THEN 1 ELSE 0 END as is_low_stock
    FROM filament_families f
    LEFT JOIN inventory_projection p ON p.filament_family_id = f.id
    WHERE f.id = ?
  `).bind(familyId).first<FamilyRow>()
}

export async function getCurrentStock(db: D1Database, familyId: string): Promise<number> {
  const row = await db.prepare(
    'SELECT COALESCE(current_quantity, 0) as qty FROM inventory_projection WHERE filament_family_id = ?'
  ).bind(familyId).first<{ qty: number }>()
  return row?.qty ?? 0
}
