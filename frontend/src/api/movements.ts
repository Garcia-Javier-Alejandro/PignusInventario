import { api } from './client'
import type { InventoryMovement } from '../types'

const BASE = '/api/inventory/movements'

export interface MovementResult {
  movement: InventoryMovement
  updated_quantity: number
}

export function receiveStock(barcode: string, quantity: number, notes?: string): Promise<MovementResult> {
  return api.post(`${BASE}/receive`, { barcode, quantity, notes: notes ?? null })
}

export function consumeStock(barcode: string, quantity: number, notes?: string): Promise<MovementResult> {
  return api.post(`${BASE}/consume`, { barcode, quantity, notes: notes ?? null })
}

export function adjustStock(filament_family_id: string, quantity_delta: number, notes: string): Promise<MovementResult> {
  return api.post(`${BASE}/adjust`, { filament_family_id, quantity_delta, notes })
}

export function patchMovement(id: string, body: { quantity_delta?: number; notes?: string }): Promise<InventoryMovement> {
  return api.patch(`${BASE}/${id}`, body)
}

export function fetchMovements(params: {
  filament_family_id?: string
  movement_type?: string
  limit?: number
  offset?: number
}): Promise<{ movements: InventoryMovement[]; total: number }> {
  const qs = new URLSearchParams()
  if (params.filament_family_id) qs.set('filament_family_id', params.filament_family_id)
  if (params.movement_type) qs.set('movement_type', params.movement_type)
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.offset) qs.set('offset', String(params.offset))
  const q = qs.toString()
  return api.get(`${BASE}${q ? `?${q}` : ''}`)
}
