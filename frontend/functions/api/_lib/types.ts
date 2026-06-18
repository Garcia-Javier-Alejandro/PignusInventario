export interface Env {
  DB: D1Database
  CACHE: KVNamespace
  RESEND_API_KEY: string
}

export interface FamilyRow {
  id: string
  brand: string
  material: string
  brand_color_name: string
  normalized_visual_color: string
  reorder_threshold: number
  photo_url: string | null
  notes: string | null
  active: number
  created_at: string
  updated_at: string
  current_quantity: number
  is_low_stock: number
}

export interface MovementRow {
  id: string
  filament_family_id: string
  movement_type: string
  quantity_delta: number
  notes: string | null
  created_by: string
  created_at: string
  updated_by: string | null
  updated_at: string | null
  brand?: string
  material?: string
  brand_color_name?: string
  normalized_visual_color?: string
}

export function formatFamily(row: FamilyRow) {
  return { ...row, active: row.active === 1, is_low_stock: row.is_low_stock === 1 }
}

export function formatMovement(row: MovementRow) {
  return { ...row }
}
