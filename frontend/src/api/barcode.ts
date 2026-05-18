import { api } from './client'
import type { FilamentFamily } from '../types'

const BASE = '/api/inventory/barcode'

export type BarcodeResult =
  | { found: true; filament_family: FilamentFamily }
  | { found: false }

export function lookupBarcode(barcode: string): Promise<BarcodeResult> {
  return api.get(`${BASE}/${encodeURIComponent(barcode)}`)
}

export function registerBarcode(barcode: string, filament_family_id: string): Promise<unknown> {
  return api.post(`${BASE}/register`, { barcode, filament_family_id })
}

export interface BarcodeMapping {
  barcode: string
  filament_family_id: string
  created_at: string
  brand: string
  material: string
  brand_color_name: string
}

export function listBarcodes(): Promise<{ mappings: BarcodeMapping[] }> {
  return api.get(BASE)
}

export function reassignBarcode(barcode: string, filament_family_id: string): Promise<unknown> {
  return api.patch(`${BASE}/${encodeURIComponent(barcode)}`, { filament_family_id })
}

export function deleteBarcode(barcode: string): Promise<unknown> {
  return api.delete(`${BASE}/${encodeURIComponent(barcode)}`)
}
