export type NormalizedVisualColor =
  | 'BLACK' | 'WHITE' | 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN'
  | 'BLUE' | 'PURPLE' | 'PINK' | 'BROWN' | 'GRAY' | 'TRANSLUCENT' | 'MULTICOLOR'

export type MovementType = 'RECEIVE_STOCK' | 'CONSUME_OPEN' | 'MANUAL_ADJUSTMENT'

export type ApiErrorCode =
  | 'BARCODE_NOT_FOUND' | 'BARCODE_CONFLICT' | 'FAMILY_NOT_FOUND'
  | 'INSUFFICIENT_STOCK' | 'INVALID_QUANTITY' | 'FAMILY_INACTIVE'
  | 'DUPLICATE_FAMILY' | 'AUTH_REQUIRED' | 'MOVEMENT_NOT_FOUND'

export interface ApiError { error: ApiErrorCode; message: string }

export interface FilamentFamily {
  id: string
  brand: string
  material: string
  brand_color_name: string
  normalized_visual_color: NormalizedVisualColor
  reorder_threshold: number
  current_quantity: number
  is_low_stock: boolean
  photo_url: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface InventoryMovement {
  id: string
  filament_family_id: string
  movement_type: MovementType
  quantity_delta: number
  notes: string | null
  created_by: string
  created_at: string
  updated_by: string | null
  updated_at: string | null
  brand?: string
  material?: string
  brand_color_name?: string
  normalized_visual_color?: NormalizedVisualColor
}

export interface DashboardSummary {
  low_stock: FilamentFamily[]
  recent_movements: InventoryMovement[]
  recently_consumed: FilamentFamily[]
  recently_received: FilamentFamily[]
  total_families: number
  low_stock_count: number
}
