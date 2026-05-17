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
