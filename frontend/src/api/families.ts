import { api } from './client'
import type { FilamentFamily } from '../types'

const BASE = '/api/inventory/families'

export interface FamiliesQuery {
  search?: string
  material?: string
  visual_color?: string
  low_stock_only?: boolean
  include_inactive?: boolean
}

export interface CreateFamilyBody {
  brand: string
  material: string
  brand_color_name: string
  normalized_visual_color: string
  reorder_threshold: number
  photo_url?: string | null
  notes?: string | null
}

export interface PatchFamilyBody {
  reorder_threshold?: number
  active?: boolean
  notes?: string | null
  photo_url?: string | null
}

export function fetchFamilies(query: FamiliesQuery = {}): Promise<{ families: FilamentFamily[] }> {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.material) params.set('material', query.material)
  if (query.visual_color) params.set('visual_color', query.visual_color)
  if (query.low_stock_only) params.set('low_stock_only', 'true')
  if (query.include_inactive) params.set('include_inactive', 'true')
  const qs = params.toString()
  return api.get(`${BASE}${qs ? `?${qs}` : ''}`)
}

export function createFamily(body: CreateFamilyBody): Promise<FilamentFamily> {
  return api.post(BASE, body)
}

export function patchFamily(id: string, body: PatchFamilyBody): Promise<FilamentFamily> {
  return api.patch(`${BASE}/${id}`, body)
}
