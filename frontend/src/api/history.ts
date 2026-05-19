import { api } from './client'

export interface TotalStockPoint {
  date: string
  total_stock: number
}

export interface FamilyStockPoint {
  date: string
  stock: number
}

export interface TotalStockHistoryResponse {
  days: number
  series: TotalStockPoint[]
}

export interface FamilyStockHistoryResponse {
  family_id: string
  days: number
  series: FamilyStockPoint[]
}

export function fetchTotalStockHistory(days = 30): Promise<TotalStockHistoryResponse> {
  return api.get(`/api/inventory/history/total-stock?days=${days}`)
}

export function fetchFamilyStockHistory(id: string, days = 30): Promise<FamilyStockHistoryResponse> {
  return api.get(`/api/inventory/history/family/${encodeURIComponent(id)}?days=${days}`)
}
