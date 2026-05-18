import { api } from './client'

export interface ImportRow {
  brand: string
  material: string
  brand_color_name: string
  normalized_visual_color: string
  initial_quantity: number
  active: boolean
  reorder_threshold?: number
}

export interface ImportRowResult {
  index: number
  ok: boolean
  family_id?: string
  status?: 'created' | 'duplicate'
  error?: string
}

export interface ImportResponse {
  created: number
  duplicates: number
  errors: number
  results: ImportRowResult[]
}

export function importInventory(rows: ImportRow[]): Promise<ImportResponse> {
  return api.post('/api/inventory/import', { rows })
}
