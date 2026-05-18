import { api } from './client'

export interface InventoryCounts {
  families: number
  movements: number
  barcodes: number
  projections: number
}

export function fetchInventoryCounts(): Promise<InventoryCounts> {
  return api.get('/api/inventory/admin/counts')
}

export function wipeAllInventory(): Promise<{ wiped: true }> {
  return api.post('/api/inventory/admin/wipe', {})
}
